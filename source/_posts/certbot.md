---
title: Certbot (setup ssl)
date: 2020-03-01 00:30:54
categories:
- Linux
tags:
- nginx
- SSL
excerpt:
- Creating SSL certificates
---

## Quick Start

### Install Certbot 

``` bash
wget https://dl.eff.org/certbot-auto
sudo mv certbot-auto /usr/local/bin/certbot-auto
sudo chown root /usr/local/bin/certbot-auto
sudo chmod 0755 /usr/local/bin/certbot-auto
```

### Either get and install your certificates

``` bash
sudo /usr/local/bin/certbot-auto --nginx
```

### Just get a certificate 

``` bash
sudo /usr/local/bin/certbot-auto certonly --nginx
```