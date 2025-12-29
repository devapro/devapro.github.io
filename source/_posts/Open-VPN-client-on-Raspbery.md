---
title: VPN Client Setup on Raspberry Pi (OpenVPN & WireGuard)
lang: en
categories:
  - Linux
  - Raspberry Pi
  - VPN
date: 2025-04-23 00:03:37
tags:
  - linux
  - raspberry Pi
  - vpn
  - openVPN
  - wireGuard
excerpt:
  - Guide to setting up VPN clients on Raspberry Pi for secure remote access
---

This guide covers setting up VPN clients on Raspberry Pi to create secure remote access from anywhere. You'll learn how to configure both OpenVPN and WireGuard, including automatic reconnection and network routing.

## Prerequisites

- Raspberry Pi with Raspbian/Raspberry Pi OS installed
- SSH or direct access to the Pi
- VPN server configuration file (.ovpn for OpenVPN or .conf for WireGuard)
- Basic command line knowledge

## Option 1: OpenVPN Client Setup

### Installation

Install the OpenVPN client:

```bash
sudo apt-get update
sudo apt-get install openvpn -y
```

### Configuration

Create the client configuration directory and add your VPN configuration file:

```bash
# Create directory if it doesn't exist
sudo mkdir -p /etc/openvpn/client

# Copy or create your VPN configuration file
sudo nano /etc/openvpn/client/client.ovpn
```

Paste your VPN provider's configuration into this file. Typical configuration includes server address, port, certificates, and authentication details.

### Start and Enable Service

Start the OpenVPN client and enable it to run on boot:

```bash
# Start the service
sudo systemctl start openvpn-client@client.service

# Enable on boot
sudo systemctl enable openvpn-client@client.service

# Check status
systemctl status openvpn-client@client.service
```

**Note:** The service name `openvpn-client@client.service` corresponds to the config file `/etc/openvpn/client/client.ovpn`. If your config file has a different name (e.g., `myvpn.ovpn`), use `openvpn-client@myvpn.service`.

### Verify Connection

Check your public IP to confirm the VPN is working:

```bash
curl ifconfig.me
```

The IP address should match your VPN server's location, not your actual location.

### Automatic Reconnection

To ensure the VPN automatically reconnects if the connection drops, add these parameters to your configuration file:

```bash
sudo nano /etc/openvpn/client/client.ovpn
```

Add at the end of the file:

```conf
# Keepalive: ping every 10 seconds, restart if no response for 60 seconds
keepalive 10 60

# Use connection timer for more reliable reconnection
ping-timer-rem
```

Restart the service to apply changes:

```bash
sudo systemctl restart openvpn-client@client.service
```

## Option 2: WireGuard Client Setup

WireGuard is a modern, lightweight VPN protocol with better performance and simpler configuration than OpenVPN.

### Installation

Install WireGuard:

```bash
sudo apt update
sudo apt install wireguard -y
```

### Configuration

Create and configure your WireGuard interface:

```bash
# Create configuration file
sudo nano /etc/wireguard/wg0.conf
```

Add your WireGuard configuration (provided by your VPN server):

```conf
[Interface]
PrivateKey = YOUR_PRIVATE_KEY
Address = 10.0.0.2/24
DNS = 1.1.1.1

[Peer]
PublicKey = SERVER_PUBLIC_KEY
Endpoint = vpn.example.com:51820
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25
```

Set proper permissions:

```bash
sudo chmod 600 /etc/wireguard/wg0.conf
```

### Start and Enable Service

Start WireGuard and enable it on boot:

```bash
# Start the VPN
sudo wg-quick up wg0

# Enable on boot
sudo systemctl enable wg-quick@wg0

# Check status
sudo wg show
```

### Enable IP Forwarding (for routing traffic)

If you want your Raspberry Pi to route traffic through the VPN:

```bash
# Enable IP forwarding
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### Configure iptables for NAT

Set up Network Address Translation (NAT) to route traffic through the VPN:

```bash
# Allow forwarding from ethernet to VPN
sudo iptables -t nat -A POSTROUTING -o wg0 -j MASQUERADE
sudo iptables -A FORWARD -i wg0 -o eth0 -m state --state RELATED,ESTABLISHED -j ACCEPT
sudo iptables -A FORWARD -i eth0 -o wg0 -j ACCEPT
```

Make iptables rules persistent across reboots:

```bash
sudo apt install iptables-persistent -y
```

During installation, choose "Yes" to save current IPv4 and IPv6 rules.

To save rules later:

```bash
sudo netfilter-persistent save
```

## Network Configuration

### Configure Static IP Address

For reliable VPN routing, set a static IP address for your Raspberry Pi:

```bash
sudo nano /etc/dhcpcd.conf
```

Add at the end of the file (adjust values for your network):

```conf
# Static IP configuration
interface eth0
static ip_address=192.168.1.100/24
static routers=192.168.1.1
static domain_name_servers=192.168.1.1 8.8.8.8

# For WiFi, use wlan0 instead
# interface wlan0
# static ip_address=192.168.1.101/24
# static routers=192.168.1.1
# static domain_name_servers=192.168.1.1 8.8.8.8
```

**Replace with your network values:**
- `192.168.1.100` - Desired static IP for your Pi
- `192.168.1.1` - Your router's IP (gateway)
- `8.8.8.8` - Secondary DNS server (Google DNS)

Restart networking:

```bash
sudo systemctl restart dhcpcd
```

## Troubleshooting

### Check VPN Status

**For OpenVPN:**
```bash
sudo systemctl status openvpn-client@client.service
journalctl -u openvpn-client@client.service -f
```

**For WireGuard:**
```bash
sudo wg show
journalctl -u wg-quick@wg0 -f
```

### Test Connectivity

```bash
# Check if VPN interface exists
ip addr show

# Check routing table
ip route

# Test internet through VPN
curl ifconfig.me

# Ping VPN server
ping 10.0.0.1  # Replace with your VPN server IP
```

### Common Issues

**OpenVPN won't start:**
- Check configuration file syntax: `sudo openvpn --config /etc/openvpn/client/client.ovpn`
- Verify certificates and keys are correct
- Check firewall settings

**WireGuard connection drops:**
- Add `PersistentKeepalive = 25` to [Peer] section
- Check if the server endpoint is reachable
- Verify firewall allows UDP traffic on WireGuard port

**No internet after connecting:**
- Verify DNS settings in VPN config
- Check if `AllowedIPs = 0.0.0.0/0` for full tunnel
- Test with: `nslookup google.com`