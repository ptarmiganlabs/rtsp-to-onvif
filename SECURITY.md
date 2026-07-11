# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it responsibly:

1. **Do not** open a public GitHub issue
2. Email: info@ptarmiganlabs.com
3. Include a description of the vulnerability and steps to reproduce

We will acknowledge receipt within 48 hours and provide a timeline for a fix.

## Supported Versions

Only the latest release (`main` branch) is supported with security updates.

## Security Measures

This project was forked from [p10tyr/rtsp-to-onvif](https://github.com/p10tyr/rtsp-to-onvif) and underwent a full security audit before deployment:

- All source code (~670 lines) reviewed for malicious behavior
- All npm dependencies audited and updated (8 vulnerabilities resolved)
- Shell injection vectors hardened (execSync → spawnSync)
- No outbound network calls, telemetry, or data exfiltration in the codebase
- Docker image runs with minimal privileges (only NET_ADMIN for macvlan/DHCP)
