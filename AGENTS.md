# AGENTS.md — rtsp-to-onvif

Small (~670 LOC) Node.js app: a virtual RTSP→ONVIF proxy. Fork of p10tyr/rtsp-to-onvif, maintained by Ptarmigan Labs. Turns any RTSP stream into an ONVIF camera for UniFi Protect.

## Architecture (entrypoints)

- `main.js` is the entrypoint: `node main.js <config.yaml>` (container uses `node main.js /onvif.yaml`).
- `src/onvif-server.js` — core ONVIF SOAP server (HTTP on port 8081; serves `/onvif/device_service` and `/onvif/media_service` via `soap`).
- `src/config-tools.js` — loads/validates config (`readAndCheckConfig`). `src/net-tools.js` — network/DHCP helpers.
- `wsdl/*.wsdl` — static WSDL files consumed by `soap`. Treat as generated/static; do not hand-edit.
- Default ports (config.yaml): server 8081, rtsp 8554, snapshot 8080. The Docker HEALTHCHECK hits 8081.

## Verification

- Unit tests: `npm test` (= `node --test`, the Node built-in runner — no extra deps). Tests live in `test/`, are hermetic (no network, no Docker), and use `node:test` + `node:assert` + `mock`.
- Syntax check: `node --check main.js && node --check src/*.js`
- Dependency audit (keep at 0 vulns): `npm audit`
- Local run: `npm ci` then `node main.js config.yaml`; set `DEBUG=1` (or `true`) for trace logging.
- Local image build: `./build-docker.sh` (tags `:latest` only).

## Docker / runtime gotchas

- Base image `node:24-alpine3.24` (Alpine pinned for reproducible builds). Image installs PRODUCTION deps only — dev tooling is absent from the built image.
- `compose.yaml` uses `network_mode: host` + `cap_add: NET_ADMIN` + `volumes: ./config.yaml:/onvif.yaml`. Required: the proxy assigns virtual IPs on a real interface and does WS-Discovery multicast. Do not "simplify" to bridge networking.
- Images publish to BOTH `ptarmiganlabs/rtsp-to-onvif` (Docker Hub) and `ghcr.io/ptarmiganlabs/rtsp-to-onvif`, as a multi-arch manifest (`linux/amd64`, `linux/arm64`).

## Releases & versioning (release-please — NEVER bump by hand)

- Version is managed by release-please. Do NOT edit `version` in `package.json`, `package-lock.json`, or `.release-please-manifest.json`.
- Conventional commits drive releases: `feat:` = minor, `fix:` = patch, `feat!`/BREAKING CHANGE = major. `chore:`, `docs:`, `ci:`, `build:` update the changelog only (no release).
- Flow: conventional commits to `main` → release-please opens/updates a PR → merge → version bumped across package.json/package-lock.json/CHANGELOG.md/manifest, git tag `rtsp-to-onvif-vX.Y.Z` + GitHub Release created → the `release: published` event triggers `docker_publish.yml` to build/push semver + `latest` tags.
- `release-please-config.json` uses `draft: false` so releases publish immediately (this is what triggers the Docker build — do not change to `true`).
- Starting version: 1.0.0.
- GitHub Actions are pinned to full commit SHAs (org policy). When updating an action, pin the SHA, not `@vX`. Release-please uses the `RELEASE_PLEASE_PAT` secret (already configured).

## Repo conventions

- `.gitattributes` enforces LF (`* text eol=lf`); if Git warns about CRLF, keep files LF.
- `.dockerignore` excludes release-please files + CHANGELOG/README/LICENSE; keep these excludes in sync when adding release-engineering files.
- Commit-message discipline is convention-only — no commitlint/husky/pre-commit in CI. Don't add them unless asked.
- Human feature work should go through PRs; the `RELEASE_PLEASE_PAT` can push directly to `main` to bypass branch protection for release automation.
