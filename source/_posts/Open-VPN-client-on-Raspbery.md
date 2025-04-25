---
title: Open VPN client on Raspbery
categories:
  - Linux
  - Raspbery
date: 2025-04-23 00:03:37
tags:
  - Linux
  - Raspbery
excerpt:
  - Create access to you Raspbery from anywhere in simple and safe way
---


Sudo apt-get install openvpn -y

sudo nano /etc/openvpn/client/client.ovpn

sudo systemctl enable openvpn-client@client.service

sudo systemctl start openvpn-client@client.service

systemctl status openvpn-client@client.service

curl ifconfig.me 


Automated Reconnection
# Edit OpenVPN config
sudo nano /etc/openvpn/client/client.ovpn

# Add these parameters:
keepalive 10 60
ping-timer-rem

----

If you have a VPN server defined with a config file in /etc/openvpn/foobar.conf then you activate that at boot time with
sudo systemctl enable openvpn@foobar