---
title: Self-hosted SIP server
date: 2025-12-12 23:14:34
lang: en
categories:
- Linux
tags:
- linux
- self-hosted
- sip
translations:
  ru: asterisk-server-rus
excerpt:
- Self-hosted SIP server
---

## Self-hosted SIP server

If you need to connect a few SIP devices in a local network, or via the internet without using a commercial SIP server, you can do it on a small VPS, Raspberry Pi.
(I suppose you already have VPS or Raspberry Pi and know how to use command line)

Step 1. Install

```bash
sudo apt update
sudo apt install asterisk
```

Check that asterisks started (You should see “active (running)”)

```bash
sudo systemctl status asterisk
```

Step 2. Configure accounts

In `sudo nano /etc/asterisk/pjsip.conf`

Add configuration:

```ini

[transport-udp]
type=transport
protocol=udp 
bind=0.0.0.0:5060 ; you can change default port
external_media_address=[ip address of VPS]
external_signaling_address=[ip address of VPS]
local_net=192.168.0.0/16 ;optional
local_net=10.0.0.0/8 ;optional

; ----- User 1 -----
[1001]
type=endpoint
context=internal
disallow=all
allow=ulaw
auth=1001
aors=1001
direct_media=no ; Force RTP through Asterisk 
rtp_symmetric=yes ; Important for NAT 
force_rport=yes ; Important for NAT 
rewrite_contact=yes ; Important for NAT

[1001]
type=auth
auth_type=userpass
password=strongpassword1
username=1001

[1001]
type=aor
max_contacts=1
remove_existing=yes

; ----- User 2 -----
[1002]
type=endpoint
context=internal
disallow=all
allow=ulaw
auth=1002
aors=1002
direct_media=no ; Force RTP through Asterisk 
rtp_symmetric=yes ; Important for NAT 
force_rport=yes ; Important for NAT 
rewrite_contact=yes ; Important for NAT
media_encryption=sdes  ; Enable SRTP for encrypted audio, which can be not supported on old devices, set no for old devices or apps. Or sdes, or dtls, or srtp

[1002]
type=auth
auth_type=userpass
password=strongpassword2
username=1002
;realm=[your domain] ; in some cases if you set defaul-realm you need to set the same for all clients

[1002]
type=aor
max_contacts=1
remove_existing=yes
qualify_frequency=60
maximum_expiration=3600
minimum_expiration=60

; Repeat if you need more users

```

**Explanation of key parameters:**

- `type=endpoint` - Defines the SIP endpoint
- `context=internal` - Which dialplan context to use
- `auth=1001` - Links to the auth section
- `aors=1001` - Links to the AOR (Address of Record)
- `max_contacts=1` - How many devices can register simultaneously
- `remove_existing=yes` - Replaces old registration on new login
- `direct_media=no` - Forces RTP through Asterisk (useful for NAT)
- `media_encryption=no` - Encription

**Options media_encryption:**

- `no` - No encryption
- `sdes` - SRTP with SDES key exchange
- `dtls` - SRTP with DTLS key exchange
Use Optional Encryption:

```
media_encryption=sdes
media_encryption_optimistic=yes ; Allow fallback to unencrypted
```


Define Dialplan in `/etc/asterisk/extensions.conf`
(For example, any user can call another (e.g., 1001 → 1002).)

```ini

[internal]
exten => _1XXX,1,Dial(PJSIP/${EXTEN},20)
exten => _1XXX,n,Hangup()
```

Reload Asterisk

```bash
sudo asterisk -rx "reload"

# OR

sudo systemctl restart asterisk

```

To verify users

```bash
sudo asterisk -rvvv
# then:
pjsip show endpoints
```

RTP Media Ports (Optional)
You can reduce numbers of ports for RTP
in `/etc/asterisk/rtp.conf`

```
[general]
rtpstart=10000
rtpend=20000
```

Check logs

```
sudo asterisk -rvvv
```

On my old Ubuntu server, I needed additional changes for using PJSIP instead of **chan_sip** (the legacy SIP channel driver). Without these changes, settings from above will not work (because settings for chan_sip should be placed in `/etc/asterisk/sip.conf` instead).

Config of Load PJSIP Module
in `/etc/asterisk/modules.conf` update list of modules for loading:
```
[modules]
autoload=yes

; Disable chan_sip
noload => chan_sip.so

; Ensure PJSIP modules are loaded
load => res_pjsip.so
load => res_pjsip_session.so
load => res_pjsip_registrar.so
load => res_pjsip_outbound_registration.so
load => chan_pjsip.so
```


### STUN

In file:  `/etc/asterisk/rtp.conf`

add:
```
[general]
rtpstart=10000
rtpend=20000
stunaddr=stun.l.google.com:19302  ; For NAT traversal
```


Check clients:
```bash
asterisk -rx "pjsip show endpoints" 
asterisk -rx "pjsip show contacts"
```

### Debug Media Negotiation Issues
```bash
asterisk -rvvvvv
```

Then in the CLI:
```
pjsip set logger on
core set debug 5
```

Make a Test Call and Watch for:
```
-- Called PJSIP/1002
-- PJSIP/1002-00000001 is ringing
[NOTICE] res_pjsip_session.c: Incompatible media format - no common codec
```

Or:
```
WARNING[xxxxx]: res_pjsip_sdp_rtp.c: No common codecs between endpoints
```

#### Understanding Status Fields

- **Avail** - Device is reachable (qualify successful)
- **Unavail** - Device didn't respond to qualify ping, **but calls may still work**
- **NonQual** - Qualify not configured
- **Unknown** - No qualify checks performed yet

**Important:** Status only affects call routing decisions if you use `qualify` in dialplan logic. For basic calling, it doesn't matter!
#### PJSIP Security Settings

In `/etc/asterisk/pjsip.conf`:

```ini

[global]
allow_anonymous=no
max_forwards=70
user_agent=Asterisk PBX
default_realm=[your domain]

; ACL to restrict registration sources (optional but recommended)
[acl]
type=acl
deny=0.0.0.0/0.0.0.0
permit=YOUR_OFFICE_IP/32
permit=YOUR_HOME_IP/32


```

Disable Unnecessary Modules in `/etc/asterisk/modules.conf`

```ini

[modules]
autoload=yes

; Disable chan_sip if using PJSIP
noload => chan_sip.so

; Disable unnecessary protocols
noload => chan_skinny.so
noload => chan_mgcp.so
noload => chan_unistim.so

; Disable web interface if not needed
noload => res_http_websocket.so
noload => res_ari.so
noload => res_stasis.so
```

Secure Asterisk Manager Interface (AMI) in `/etc/asterisk/manager.conf`

```ini

[general]
enabled = no  ; Disable if not needed
port = 5038
bindaddr = 127.0.0.1  ; Only local access

; If you need AMI, use strong credentials:
[admin]
secret = VeryStr0ngAMIPass123!
deny = 0.0.0.0/0.0.0.0
permit = 127.0.0.1/255.255.255.0
read = system,call,log,verbose,command,agent,user,config
write = system,call,log,verbose,command,agent,user,config
```

Check for suspicious activity:

```bash
# Check failed registration attempts
asterisk -rx "pjsip show registrations"

# Monitor active channels
asterisk -rx "core show channels"
```

## SSL

Option A: Let's Encrypt (Free & Recommended)
```bash
# Install Certbot
sudo apt update
sudo apt install certbot

# Get certificate
sudo certbot certonly --standalone -d [your domain]

# Certificate will be at:
# /etc/letsencrypt/live/[your domain]/fullchain.pem
# /etc/letsencrypt/live/[your domain]/privkey.pem
```

Option B: Self-Signed Certificate
```bash

sudo mkdir -p /etc/asterisk/keys
cd /etc/asterisk/keys

# Generate private key and certificate
sudo openssl req -new -x509 -days 365 -nodes \
  -out asterisk.pem -keyout asterisk.key \
  -subj "/C=RU/ST=State/L=City/O=Organization/CN=s.mdroid.ru"

# Combine them
sudo cat asterisk.key asterisk.pem > asterisk.combined.pem
sudo chmod 600 asterisk.combined.pem
```

Set Proper Permissions
```bash
# For Let's Encrypt certificates
sudo chown -R asterisk:asterisk /etc/letsencrypt/
sudo chmod -R 640 /etc/letsencrypt/live/s.mdroid.ru/*.pem

# For self-signed certificates
sudo chown asterisk:asterisk /etc/asterisk/keys/*
sudo chmod 600 /etc/asterisk/keys/*
```
#### Configure

In file: `/etc/asterisk/pjsip.conf`
```ini
[global]
max_forwards=70
user_agent=Asterisk PBX
default_realm=[your domain or asterisk]

; UDP Transport (keep for backward compatibility)
[transport-udp]
....

; TLS Transport (secure)
[transport-tls]
type=transport
protocol=tls
bind=0.0.0.0:5061
cert_file=/etc/letsencrypt/live/[your domain]/fullchain.pem
priv_key_file=/etc/letsencrypt/live/[your domain]/privkey.pem
; OR for self-signed:
; cert_file=/etc/asterisk/keys/asterisk.combined.pem
; priv_key_file=/etc/asterisk/keys/asterisk.combined.pem
;cipher=ALL ; use only if you know which format is supported
method=sslv23 ; or tlsv1_2 for modern devices
verify_server=no
verify_client=no
external_media_address=[server ip]
external_signaling_address=[server ip]

; Update endpoints to use TLS
[1001]
type=endpoint
context=internal
;transport=transport-tls ;optional to force use TLS
disallow=all
allow=ulaw
allow=alaw
auth=1001
aors=1001
direct_media=no
rtp_symmetric=yes
force_rport=yes
rewrite_contact=yes
media_encryption=sdes  ; Enable SRTP for encrypted audio, which can be not supported on old devices, set no for old devices or apps. Or sdes, or dtls

[1001]
type=auth
auth_type=userpass
password=YourStrongPassword
username=1001
;realm=[your domain] ; in some cases if you set defaul-realm you need to set the same for all clients

[1001]
type=aor
max_contacts=1
remove_existing=yes
qualify_frequency=60
```

Reload:
```bash
# Reload
asterisk -rx "core reload"
asterisk -rx "pjsip reload"

# Verify TLS transport is running
asterisk -rx "pjsip show transports"
```

You should see output like:
```bash
Transport:  <TransportId........>  <Type>  <cos>  <tos>  <BindAddress.....................>
===========================================================================
transport-udp               udp      0      0  0.0.0.0:5060
transport-tls               tls      0      0  0.0.0.0:5061
```

If you don't see `transport-tls`, check logs:

```
tail -50 /var/log/asterisk/full | grep -i transport
```
If you see an error:

```
RROR[1069851] res_sorcery_config.c: Could not create an object of type 'transport' with id 'transport-tls' from configuration file 'pjsip.conf'
```

Check:
- That path to cert files is correct
- Remove or change cipher parameter (works for me: `cipher=ADH-AES256-SHA,ADH-AES128-SHA`)

For self-signed certificates you need to disable validation certificate on client or add to `/etc/asterisk/pjsip.conf`:

```ini
[transport-tls]
....
require_client_cert=no
```
