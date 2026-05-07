
---
layout: ps
title: investigation
date: 2026-05-08 00:05:29
tags: linux
---

# How to Recover Disk Space on a Full Linux Server

If your Linux server runs out of disk space, here’s a quick, effective process to find and fix the problem.

## 1. Check Disk Usage

Start by seeing which filesystem is full:

```bash
df -h
```

If you suspect inode exhaustion (lots of tiny files), check:

```bash
df -i
```

## 2. Find Large Directories

Identify which folders use the most space:

```bash
sudo du -h -d 1 -x / 2>/dev/null | sort -hr | head -20
```

- `-x` keeps the scan on the main filesystem.
- For an interactive view, try `ncdu`:

```bash
sudo apt install ncdu
sudo ncdu -x /
```

## 3. Remove Unneeded Large Files

Look for unusually large files, especially in `/usr/local`, `/var`, or `/home`. Static libraries (`.a` files) and old build artifacts are common culprits. If you find something you no longer need, remove it:

```bash
sudo rm /path/to/large/file
sudo ldconfig
```

## 4. Fix “Phantom” Disk Usage

If `df` shows more used space than `du`, you may have deleted files still held open by running processes. Find them with:

```bash
sudo lsof +L1 2>/dev/null | awk 'NR==1 || $7+0 > 10000000'
```

Restart the process holding the file (e.g., Docker):

```bash
sudo systemctl restart docker
```

## 5. Prevent Future Issues (Docker Log Rotation)

Docker logs can silently fill your disk. Set up log rotation in `/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "3"
  }
}
```

Restart Docker:

```bash
sudo systemctl restart docker
```

Recreate containers to apply the new policy.

## Quick Cleanup Commands

```bash
docker system df
docker container prune -f
docker builder prune -af
docker image prune -af
journalctl --disk-usage
sudo journalctl --vacuum-size=200M
sudo apt autoremove --purge
sudo apt clean
```

---
This version removes personal anecdotes and focuses on actionable steps, making it easy to follow as a general-purpose tutorial.

Total recovered: ~7GB. Total time: about 20 minutes. Lesson value: priceless.