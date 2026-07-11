# 📸 Virtual Onvif Proxy
Simple docker container to add any RTSP stream into Unify Protect 5+

> **This is a fork of [p10tyr/rtsp-to-onvif](https://github.com/p10tyr/rtsp-to-onvif)** by Piotr Kula, which itself was forked from [daniela-hase/onvif-server](https://github.com/daniela-hase/onvif-server) by Daniela Hasenbring.
>
> The original repository had not been updated for several years. This fork includes:
> - Security audit of all source code and dependencies
> - Dependency updates (soap 1.1.5 → 1.9.3, yaml 2.6.1 → 2.9.0, node-uuid → uuid) — resolved 8 npm vulnerabilities (2 critical, 3 high)
> - Code fixes (process.exit bug, this.listen binding, shell injection hardening)
> - Dockerfile improvements (pinned Alpine version, HEALTHCHECK)
> - CI fixes (dependabot config, workflow capitalization bug)
> - Improved documentation (build from source, Linux requirement, config reference)
>
> Original work © Piotr Kula and Daniela Hasenbring. See [LICENSE](LICENSE).

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

In a few steps you will have everything needed to run container first time. This will auto configure IP's for you.
If you want more control over MAC's and IP's scroll down to Router Setup

> ⚠️ **Linux host required**
>
> This container requires `network_mode: "host"` and `CAP_NET_ADMIN` to create virtual network interfaces (macvlan) and participate in ONVIF multicast discovery. These features **only work on Linux hosts** — they are not supported on macOS or Windows Docker Desktop. Use a Linux server, VM, or LXC container.


## Option A: Pull the pre-built image with Docker Compose

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
   - `sudo docker compose up -d`


## Option B: Build from source with Docker Compose

If you forked or cloned this repository and want to build the image yourself, the `compose.yaml` file includes a `build: .` directive so Docker Compose will build the image from the local `Dockerfile` automatically.

1. Clone the repository and change into it
   - `git clone https://github.com/p10tyr/rtsp-to-onvif.git` and `cd rtsp-to-onvif`
2. Create your config file from the example
   - `cp config.example.yaml config.yaml`
3. Edit and configure your cameras
   - `nano config.yaml`
4. Build and run in attached mode
   - `sudo docker compose up`
5. If you see the cameras show up in Protect then you can run docker in detached mode
   - `sudo docker compose up -d`

To force a rebuild after making code changes:
   - `sudo docker compose up --build`


## Option C: Build the image manually with Docker

1. Clone the repository and change into it
   - `git clone https://github.com/p10tyr/rtsp-to-onvif.git` and `cd rtsp-to-onvif`
2. Build the Docker image
   - `docker build -t mountaindude/rtsp-to-onvif:latest .`
   - Or use the included build script: `./build-docker.sh`
3. Create your config file from the example
   - `cp config.example.yaml config.yaml`
4. Edit and configure your cameras
   - `nano config.yaml`
5. Run the container
   - `docker run --network host --cap-add NET_ADMIN -v $(pwd)/config.yaml:/onvif.yaml mountaindude/rtsp-to-onvif:latest`


## Config file

- You just need to supply the bare minimum for each camera
- Autoconfigure MAC addresses all use Unicast LAA prefix `1A:11:B0` and the NIC address will be random
- UUID addresses will be added automatically
- IPv4 will come from your DHCP server

> ℹ️ **NOTE** 
> 
> This file will be overwritten during automatic configuration so comments will be lost. Keep a backup of your commented version.
> 
> No username or passwords required here!

**Minimal required fields per camera:**

| Field | Purpose | Example |
|---|---|---|
| `name` | Display name in ONVIF consumer (letters only, no spaces) | `BulletCam` |
| `dev` | Host network interface for virtual IP (find via `ip addr`) | `enp2s0` |
| `target.hostname` | Your camera's IP address | `192.168.1.187` |
| `target.ports.rtsp` | Camera's RTSP port | `554` |
| `target.ports.snapshot` | Camera's HTTP port for snapshots | `80` |
| `highQuality.rtsp` | RTSP stream path | `/Streaming/Channels/101/` |
| `highQuality.snapshot` | Snapshot URL path | `/ISAPI/Streaming/Channels/101/picture` |
| `highQuality.width` / `height` | Video resolution | `2048` / `1536` |
| `highQuality.framerate` | FPS | `15` |
| `highQuality.bitrate` | Video bitrate in kb/s | `3072` |
| `highQuality.quality` | Quality (leave at 4) | `4` |
| `ports.server` / `rtsp` / `snapshot` | Virtual server ports (change if conflicts) | `8081` / `8554` / `8080` |

**Auto-generated (don't set these initially):**
- `mac` — auto-created with LAA prefix `1A:11:B0:XX:XX:XX`, IP assigned via DHCP
- `uuid` — auto-generated UUIDv4 (ONVIF device identifier)

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
Thank you Daniela Hase for releasing the original script to the public!
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
- Scrubbing does not seem to work? Possibly depends on the h264 implementation on the camera
- Snapshot not implemented yet. Hope it works.
- HighProfile support only for now - You can supply LowProfile but that shows up as an extra camera.


# ⚒️ Roadmap
- Simplify docker - DONE
  - Only run in Docker - DONE
  - Auto virtual MAC registrations - DONE
  - Register with DHCP - DONE
  - More debug messages - DONE
- Learn about the ONVIF Profile S
  - Implement snapshot functionality?
  - Implement some other features?


# 🛜 Docker and Docker Compose

Debug is enabled by default in compose.yaml
Once you have setup complete you can disable it.

## compose.yaml file 

You don't really have to change anything in this file.
It has all the settings and permissions required to make it just work.

Some properties
- `build: .` - Builds the image from the local Dockerfile instead of pulling from Docker Hub
- `volumes: ./config.yaml:/onvif.yaml` - where your config file is. Next step
- `cap_add: NET_ADMIN` - Required to create virtual networks based on config file
- `environment: DEBUG: 1` - Set to 0 (or remove) to disable debug logs

## Router setup

ONVIF discovery works by using MAC addresses.
If you are happy with DHCP you can skip this step

If you really want static reservations - Do that BEFORE running the container.

Add static reservations using LAA MAC's
- MAC's starting with `x2:xx:xx:xx:xx:xx`,`x6:xx:xx:xx:xx:xx`,`xA:xx:xx:xx:xx:xx` and `xE:xx:xx:xx:xx:xx` are Locally Administered Addresses (LAA)


Virtual ONVIF 1
- MAC 0A:00:00:00:00:51
- IP 192.168.51

Virtual ONVIF 2
- MAC 0A:00:00:00:00:52
- IP 192.168.52

## Known problems

Usually multiple cameras will just work out of the box with the same server ports working for each virtual IP 

If you seem to have problems like
- MAC Addresses not showing properly for multiple cameras in Protect
- Port numbers in use error during startup
- MAC shows the wrong IP

Generally depends from OS to OS. 
Eg in Ubuntu 22. 

You need to run these commands to allow virtual interface max advertising - but you still need a different port per virtual IP

```bash
sudo sysctl -w net.ipv4.conf.all.arp_ignore=1
sudo sysctl -w net.ipv4.conf.all.arp_announce=2
```


### Other stuff

Misc notes

---

Remove a virtual IP on the host without rebooting
`sudo ip link del dev rtsp2onvif_<number>`

---

Wrapping an RTSP Stream

This tool is used to create ONVIF devices from regular RTSP streams by creating the following configuration.

Cameras before ONVIF had all kinds of weird and wonderful implementations

You will have to find out the stream and snapshot details with your own research, by searching the web for URLs.
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

If you have a separate low-quality RTSP stream available, fill in the information for the `lowQuality` section above but this shows up as a separate camera in Unify. 

> [!NOTE]
> Since we don't provide a snapshot url you will only see the Onvif logo in certain places in Unifi Protect where it does not show the livestream.

[^1]: [What is MacVLAN?](https://ipwithease.com/what-is-macvlan)
[^2]: [Wikipedia: Locally Administered MAC Address](https://en.wikipedia.org/wiki/MAC_address#:~:text=Locally%20administered%20addresses%20are%20distinguished,how%20the%20address%20is%20administered.)
[^3]: [UUIDv4 Generator](https://www.uuidgenerator.net/)
[^4]: [Virtual Interfaces with different MAC addresses](https://serverfault.com/questions/682311/virtual-interfaces-with-different-mac-addresses)
