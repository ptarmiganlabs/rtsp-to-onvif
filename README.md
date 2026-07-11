# 📸 Virtual Onvif Proxy (Fork)
Simple docker container to add any RTSP stream into Unify Protect 5+

Maintained by [mountaindude](https://github.com/mountaindude) ([Ptarmigan Labs](https://github.com/ptarmiganlabs)).

---

## Why this fork?

This is a fork of [p10tyr/rtsp-to-onvif](https://github.com/p10tyr/rtsp-to-onvif) by Piotr Kula, which itself was forked from [daniela-hase/onvif-server](https://github.com/daniela-hase/onvif-server) by Daniela Hasenbring. The original repository had not been updated for several years.

This fork was created to:

- **Security audit** all source code and dependencies before running in production
- **Update dependencies** to resolve 8 npm vulnerabilities (2 critical, 3 high, 2 moderate, 1 low)
- **Fix code bugs** (process.exit, this.listen binding, shell injection hardening)
- **Improve Docker setup** (pinned Alpine version, HEALTHCHECK, compose build directive)
- **Fix CI** (dependabot config, workflow capitalization bug)
- **Build and publish new Docker images** under `mountaindude/rtsp-to-onvif` (Docker Hub + GitHub Container Registry)
- **Long term maintenance** (Make it easy to update dependencies, rebuild, and publish new images)

## Security audit results

A thorough security audit was performed as part of this fork. The codebase is small (~670 lines of JavaScript) and was reviewed in its entirety.

**Verdict: Not malicious.** No outbound callbacks, no data exfiltration, no telemetry, no arbitrary code download/execution. All network operations are local (WS-Discovery multicast, TCP proxy, DHCP). All URLs are either ONVIF/W3C namespace constants or constructed from the user's own config file.

### Dependencies updated

| Package | Old version | New version | Reason |
|---|---|---|---|
| `soap` | 1.1.5 | 1.9.3 | Resolved xmldom, lodash, xml-crypto, form-data, formidable, axios CVEs |
| `yaml` | 2.6.1 | 2.9.0 | Stack overflow fix (GHSA-48c2-rrv3-qjmp) |
| `node-uuid` | 1.4.8 | replaced with `uuid` ^11.0.0 | Deprecated package; crypto-secure RNG instead of Math.random() |

Result: `npm audit` reports **0 vulnerabilities** (down from 8).

### Code fixes

| Bug | File | Fix |
|---|---|---|
| `exit(-1)` throws ReferenceError | `src/config-tools.js` | Changed to `process.exit(-1)` |
| `this.listen` loses context in HTTP server | `src/onvif-server.js` | Wrapped in arrow function to preserve `this` binding |
| Shell injection via config values | `src/config-tools.js` | Replaced `execSync` string interpolation with `spawnSync` arg arrays |

### Docker improvements

- Pinned base image `node:22-alpine` → `node:22-alpine3.20` (reproducible builds)
- Added `HEALTHCHECK` with `curl`
- Uncommented `restart: unless-stopped`

### CI fixes

- Fixed `.github/dependabot.yml` — empty `package-ecosystem: ""` → `npm`, `docker`, `github-actions`
- Fixed `.github/workflows/docker_publish.yml` — `${{Github.run_number}}` → `${{ github.run_number }}` (case-sensitive)
- Updated workflow to publish to both Docker Hub and GitHub Container Registry
- Removed Docker Build Cloud config from upstream author


## My camera setup

I'm using an **Axis Companion Bullet Mini LE** at `192.168.1.112` with credentials `root` / `pass`.

### Finding the RTSP path

The RTSP path was determined by testing with `ffprobe`:

```bash
ffprobe "rtsp://root:pass@192.168.1.112/axis-media/media.amp?videocodec=h264&Axis-Orig-Sw=true"
```

Output confirmed:
- **Codec**: H264 (High profile)
- **Resolution**: 1920x1080
- **Framerate**: 30 fps

### Snapshot authentication issue

The snapshot endpoint (`/axis-cgi/jpg/image.cgi`) was tested with various curl auth options (`-u`, `--digest`, `--anyauth`) but none returned a valid JPEG — the camera likely requires a specific digest auth handshake that curl couldn't negotiate.

**This is not a problem for Unifi Protect.** The live RTSP stream works perfectly, and Protect shows the ONVIF logo placeholder where snapshots aren't available. The snapshot path is still included in the config for completeness.

### Working config.yaml

This is the exact config running in production:

```yaml
onvif:
  - name: AxisCompanionBulletMiniLE
    dev: ens18
    target:
      hostname: 192.168.1.112
      ports:
        rtsp: 554
        snapshot: 80
    highQuality:
      rtsp: /axis-media/media.amp?videocodec=h264&Axis-Orig-Sw=true
      snapshot: /axis-cgi/jpg/image.cgi
      width: 1920
      height: 1080
      framerate: 30
      bitrate: 4096
      quality: 4
    ports:
      server: 8081
      rtsp: 8554
      snapshot: 8282
```

**Notes:**
- `dev: ens18` — the VM's network interface (find yours with `ip addr` on the Linux host)
- `ports.snapshot: 8282` — changed from the default `8080` because it was already in use on the host
- `mac` and `uuid` are intentionally omitted — auto-generated on first run and written back to the file
- Credentials (`root`/`pass`) are **not** in the config file — enter them in Unifi Protect during adoption


## Quick start

> ⚠️ **Linux host required**
>
> This container requires `network_mode: "host"` and `CAP_NET_ADMIN` to create virtual network interfaces (macvlan) and participate in ONVIF multicast discovery. These features **only work on Linux hosts** — they are not supported on macOS or Windows Docker Desktop. Use a Linux server, VM, or LXC container.

### Option A: Use a pre-built image (recommended)

1. Download the files you need and configure
   ```bash
   mkdir rtsp-to-onvif && cd rtsp-to-onvif
   wget https://raw.githubusercontent.com/mountaindude/rtsp-to-onvif/refs/heads/release/compose.yaml
   wget https://raw.githubusercontent.com/mountaindude/rtsp-to-onvif/refs/heads/release/config.example.yaml
   cp config.example.yaml config.yaml
   nano config.yaml    # edit with your camera details
   ```

2. Pull and run
   ```bash
   sudo docker compose up
   ```

Watch the logs for:
- `CONFIG: UUIDv4 - <generated>`
- `CONFIG: MAC - <generated>`
- `SERVER: <camera name> - HTTP listening on <ip>:8081`
- `PROXY: 8554 --> <camera ip>:554`

### Option B: Build from source

1. Clone the repository
   ```bash
   git clone https://github.com/mountaindude/rtsp-to-onvif.git
   cd rtsp-to-onvif
   ```

2. Create your config
   ```bash
   cp config.example.yaml config.yaml
   nano config.yaml    # edit with your camera details
   ```

3. Build and run with Docker Compose
   ```bash
   sudo docker compose up --build
   ```

   Or build manually then run:
   ```bash
   docker build -t mountaindude/rtsp-to-onvif:latest .
   # Or use the included build script:
   ./build-docker.sh
   docker run --network host --cap-add NET_ADMIN -v $(pwd)/config.yaml:/onvif.yaml mountaindude/rtsp-to-onvif:latest
   ```

Watch the logs for:
- `CONFIG: UUIDv4 - <generated>`
- `CONFIG: MAC - <generated>`
- `SERVER: <camera name> - HTTP listening on <ip>:8081`
- `PROXY: 8554 --> <camera ip>:554`

### Adopt in Unifi Protect

Go to Protect → Devices → Add Device. The camera should appear. Adopt it and enter your camera's credentials.

### Switch to detached mode

Once confirmed working, stop with `Ctrl+C` and run:

```bash
sudo docker compose up -d
```

### Reduce log verbosity (optional)

Debug logging is enabled by default. To disable, edit `compose.yaml` and set `DEBUG: 0`:

```yaml
    environment:
      DEBUG: 0
```

Then restart: `sudo docker compose up -d`

### Useful commands

```bash
# View logs when running detached
sudo docker compose logs -f

# Stop the container
sudo docker compose down

# Rebuild after pulling code updates (if building from source)
git pull && sudo docker compose up --build -d

# Clean up stale virtual interfaces if the container didn't exit cleanly
sudo ip link del dev rtsp2onvif_0
```

### Multiple cameras with ARP issues

If multiple cameras show wrong MAC/IP in Protect, run on the host before starting:

```bash
sudo sysctl -w net.ipv4.conf.all.arp_ignore=1
sudo sysctl -w net.ipv4.conf.all.arp_announce=2
```

To persist across reboots:
```bash
echo 'net.ipv4.conf.all.arp_ignore=1' | sudo tee /etc/sysctl.d/99-onvif.conf
echo 'net.ipv4.conf.all.arp_announce=2' | sudo tee -a /etc/sysctl.d/99-onvif.conf
```


## Config file reference

- You just need to supply the bare minimum for each camera
- MAC addresses auto-generated with Unicast LAA prefix `1A:11:B0` and random NIC address
- UUID addresses auto-generated (UUIDv4)
- IPv4 comes from your DHCP server

> ℹ️ **NOTE**
>
> This file will be overwritten during automatic configuration so comments will be lost. Keep a backup of your commented version.
>
> No username or passwords required here!

**Minimal required fields per camera:**

| Field | Purpose | Example |
|---|---|---|
| `name` | Display name in ONVIF consumer (letters only, no spaces) | `AxisCompanionBulletMiniLE` |
| `dev` | Host network interface for virtual IP (find via `ip addr`) | `ens18` |
| `target.hostname` | Your camera's IP address | `192.168.1.112` |
| `target.ports.rtsp` | Camera's RTSP port | `554` |
| `target.ports.snapshot` | Camera's HTTP port for snapshots | `80` |
| `highQuality.rtsp` | RTSP stream path | `/axis-media/media.amp?videocodec=h264` |
| `highQuality.snapshot` | Snapshot URL path | `/axis-cgi/jpg/image.cgi` |
| `highQuality.width` / `height` | Video resolution | `1920` / `1080` |
| `highQuality.framerate` | FPS | `30` |
| `highQuality.bitrate` | Video bitrate in kb/s | `4096` |
| `highQuality.quality` | Quality (leave at 4) | `4` |
| `ports.server` / `rtsp` / `snapshot` | Virtual server ports (change if conflicts) | `8081` / `8554` / `8282` |

**Auto-generated (don't set these initially):**
- `mac` — auto-created with LAA prefix `1A:11:B0:XX:XX:XX`, IP assigned via DHCP
- `uuid` — auto-generated UUIDv4 (ONVIF device identifier)


## Docker image

Images are published to two registries:

| Registry | Image |
|---|---|
| Docker Hub | `mountaindude/rtsp-to-onvif:latest` |
| GitHub Container Registry | `ghcr.io/mountaindude/rtsp-to-onvif:latest` |

The `compose.yaml` pulls the pre-built image from Docker Hub by default. To use the GitHub Container Registry image instead, comment out the Docker Hub `image:` line and uncomment the GHCR line in `compose.yaml`.

### Building from source

To build the image locally instead of pulling a pre-built one:

**With Docker Compose** — add `build: .` to `compose.yaml` and run:
```bash
sudo docker compose up --build
```

**Manually with Docker:**
```bash
docker build -t mountaindude/rtsp-to-onvif:latest .
# Or use the included build script:
./build-docker.sh
```

Then run with the built image:
```bash
docker run --network host --cap-add NET_ADMIN -v $(pwd)/config.yaml:/onvif.yaml mountaindude/rtsp-to-onvif:latest
```


---
---

# Original README (from [p10tyr/rtsp-to-onvif](https://github.com/p10tyr/rtsp-to-onvif))

*Preserved as-is for reference. The sections below are from the upstream repository and may contain outdated information, original typos, and references to the original Docker image name (`kulasolutions/rtsp-to-onvif`).*

---

# 📸 Virtual Onvif Proxy
Simple docker container to add any RTSP stream into Unify Protect 5+

This is a continuation from the simple virtual ONVIF proxy that was originally released by Daniela Hase.
  
This repository has added features such as ...
- Making it a pure docker appliance. Pull-And-Run™
- Only deals with RSTP to ONVIF proxies
- Auto creates MAC addresses and registers IPv4 with DHCP
- more to come...

What can you adopt?
- Adopt `IP camera --> RTSP (h264) --> Protect` 
- Adopt `Raspberry Pi Camera --> uv4l --> RTSP (h254) -- Protect`
- Adopt `Analog --> NVR --> RTSP (h264) --> Protect` 
- Adopt `WebCam --> go2rtc --> RTSP (h264) --> Protect`
- Adopt `... Anything RTSP --> Protect`

IP camera --> RTSP (h264) --> Protect

![image](https://github.com/user-attachments/assets/7fa9ab55-7830-4602-a1e5-d1ad9184117e)

Analog! --> NVR --> RTSP (h264) --> Protect

![analog-dvr-rtsp](https://github.com/user-attachments/assets/ef401f8d-c56c-4ab0-8a44-630823a35ad7)


# 🧾 Getting Started

In a few steps you will have everything needed to run container first time. This will auto confiugre IP's for you.
If you want more control over MAC's and IP's scroll down to Router Setup

## Docker compose

Create a directory locally where you will keep your compose and config files.

1. Create a directory and change into it
  - `mkdir rtsp-to-onvif` and `cd rtsp-to-onvif`
2. Download the compose.yaml file
  - `wget https://raw.githubusercontent.com/p10tyr/rtsp-to-onvif/refs/heads/release/compose.yaml`
3. Download the config.example.yaml and clone it
  - `wget https://raw.githubusercontent.com/p10tyr/rtsp-to-onvif/refs/heads/release/config.example.yaml`
  - `cp config.example.yaml config.yaml`
4. Edit and configure your cameras
  - `nano config.yaml`
5. Run compose in attached mode and check for any messages.
  - `sudo docker compose up`
6. If you see the cameras show up in Protect then you can run docker in detached mode (or use Dockge, Portainer, etc...)
  - `sudo docker compose up d`


## Config file

- You just need to supply the bare minimum for each camera
- Autoconfigure MAC addresses all use Unicast LAA prefix `1A:11:B0` and the NIC address will be random
- UUID addresses will be added automatically
- IPv4 will come from your DHCP server

> ℹ️ **NOTE** 
> 
> This file will be overwritten during automatic configuration so comments will be lost.
> 
> No username or passwords required here!


```yaml
onvif:
  - name: BulletCam                               # A user define named that will show up in the consumer device. Use letters only, no spaces or special characters
    dev: enp2s0 #eth0                             # Network interface to add virtual IP's too. use ip addr to find your name
    target:
      hostname: 192.168.1.187                      # Your cameras IPv4 address
      ports:
        rtsp: 554                                  # Your cameras RTSP port. Typically 554
        snapshot: 80                               # Cameras non https port for snapshots
    highQuality:
      rtsp: /Streaming/Channels/101/                    # The RTSP Path
      snapshot: /ISAPI/Streaming/Channels/101/picture   # Snapshot path - not working yet
      width: 2048                                       # The Video Width
      height: 1536                                      # The Video Height
      framerate: 15                                     # The Video Framerate/FPS
      bitrate: 3072                                     # The Video Bitrate in kb/s
      quality: 4                                        # Quality, leave this as 4 for the high quality stream.
    ports:                                              # Virtual server ports. No need to change these unles you run into port already in use problems
      server: 8081
      rtsp: 8554
      snapshot: 8080
    #mac - automatically added here and IP comes from DHCP- Add your own if you know what you doing
    #uuid - ONVIF ID - automatically added here. If you change it Protect will think its a different camera
```


## Credits
Thank you Daniela Hase for relasing the original script to the public!
Original repository https://github.com/daniela-hase/onvif-server

It has truly inspired me and gave me so many ideas! 
That is why I had to fork your original repo so that I could develop this further to be a docker appliance.

## Unifi Protect
Tested on Unifi Protect 5.0.40+

Once the device shows up in protect, make sure the correct MAC address is assigned to the IP before adopting. 
You can then adopt it and provide the username and password that are set on the real RTSP device.

Known Limitations

> "Third-party features such as analytics, audio playback, and pan-tilt-zoom (PTZ) control are not supported." - Unify Support

- Seems to only support recording normal/high profile h264 video streams at the moment
- Your luck with h265 may vary
- Scrubbing does not seem to work? Possibly depends on the h264 implementaion on the camera
- Snapshot not implemented yet. Hope it works.
- HighProfile support only for now - You can supply LowProfile but that shows up as an extra camera.


# ⚒️ Roadmap
- Simplyfy docker - DONE
  - Only run in Docker - DONE
  - Auto virtual MAC registrations - DONE
  - Register with DCHP - DONE
  - More debug messages - DONE
- Learn about the ONVIF Profile S
  - Implement snapshot functionality?
  - Implement some other features?


# 🛜 Docker and Docker Compose

Debug is enabled byu default in compose.yaml
Once you have setup complete you can disable it.

## compose.yaml file 

You don't really have to change anything in this file.
It has all the settings and permsions required to make it just work.

Some properties
- `volumnes: ./config.yaml:/onvif.yaml` - where your config file is. Next step
- `cap_add: NET_ADMIN` - Required to create virtual networks based on config file
- `environment: DEBUG:1` - Uncommnet if you need more debug logs to show up

## Router setup

ONVIF discovery works by using MAC addresses.
If you are happy with DHCP you can skip this step

If you really static reservations - Do that BEFORE running the container.

Add static reservatations using LAA MAC's
- MAC's starting with `x2:xx:xx:xx:xx:xx`,`x6:xx:xx:xx:xx:xx`,`xA:xx:xx:xx:xx:xx` and `xE:xx:xx:xx:xx:xx` are Locally Administered Addresses (LAA)


Virtual ONVIF 1
- MAC 0A:00:00:00:00:51
- IP 192.168.51

Virtual ONVIF 2
- MAC 0A:00:00:00:00:52
- IP 192.168.52

## Konwn problems

Usuaully mulitple camera will just work out the box with the same server ports working for each virtual IP 

If you seem to have problems like
- MAC Addresses not showing properly for multiple cameras in Protect
- Port numbers in use error during startup
- MAC shows the wrong IP

Generally depends from OS to OS. 
Eg in Ubuntu 22. 

You need to run these commands to allow virtual interface max advertising - but you still need a differnt port per virtual IP

```bash
sudo sysctl -w net.ipv4.conf.all.arp_ignore=1
sudo sysctl -w net.ipv4.conf.all.arp_announce=2
```


### Other stuff

Misc notes

---

Remove a virutal IP on the host without rebooting
`sudo ip link del dev rtsp2onvif_<number>`

---

Wrapping an RTSP Stream

This tool is used to create ONVIF devices from regular RTSP streams by creating the following configuration.

Cameras before ONVIF had all kinds of weird and wonderful implemenations

You will have to find out the stream and snapshot details with your own research, by seraching the web for URLS.
You should verify the stream using VLC and the snapshot URL using a browser.

Things to look out for
- http is enabled (for snapshots)
- if snapshot is not working, try admin account. some cameras are like that
- rtsp is enabled ideally on port 554

**RTSP Example:**
Assume you have this RTSP stream:
```txt
rtsp://192.168.1.32:554/Streaming/Channels/101/
       \__________/ \_/\______________________/
            |       Port    |
         Hostname           |
                          Path
```
If your RTSP url does not have a port it uses the default port 554.

Your RTSP url may contain a username and password - those should NOT be included in the config file.
Instead you will have to enter them in the software that you plan on consuming this Onvif camera in, for example during adoption in Unifi Protect.

Next you need to figure out the resolution and framerate for the stream. If you don't know them, you can use VLC to open the RTSP stream and check the _Media Information_ (Window -> Media Information) for the _"Video Resolution"_ and _"Frame rate"_ on the _"Codec Details"_ page, and the _"Stream bitrate"_ on the _"Statistics"_ page. The bitrate will fluctuate quite a bit most likely, so just pick a number that is close to it (e.g. 1024, 2048, 4096 ..).

You can either randomly change a few numbers of the UUID, or use a UUIDv4 generator[^3].

If you have a separate low-quality RTSP stream available, fill in the information for the `lowQuality` section above but this shows up as a seperate camera in unify. 

> [!NOTE]
> Since we don't provide a snapshot url you will onyl see the Onvif logo in certain places in Unifi Protect where it does not show the livestream.

[^1]: [What is MacVLAN?](https://ipwithease.com/what-is-macvlan)
[^2]: [Wikipedia: Locally Administered MAC Address](https://en.wikipedia.org/wiki/MAC_address#:~:text=Locally%20administered%20addresses%20are%20distinguished,how%20the%20address%20is%20administered.)
[^3]: [UUIDv4 Generator](https://www.uuidgenerator.net/)
[^4]: [Virtual Interfaces with different MAC addresses](https://serverfault.com/questions/682311/virtual-interfaces-with-different-mac-addresses)
