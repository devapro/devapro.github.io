---
title: How to Configure Swap File on Raspberry Pi
lang: en
categories:
  - Linux
  - Raspberry Pi
date: 2025-12-29 17:30:00
tags:
  - linux
  - raspberry Pi
  - swap
excerpt:
  - Guide to creating and configuring a swap file on Raspberry Pi to improve performance and prevent out-of-memory errors
---

Swap space is essential for Raspberry Pi systems with limited RAM. This guide shows you how to create and configure a swap file to improve system stability and performance.

## What is Swap?

Swap is disk space used as virtual memory when your system's RAM is full. When RAM usage is high, Linux moves inactive pages from RAM to swap, freeing up memory for active processes.

### Why You Need Swap on Raspberry Pi

- **Prevent Out-of-Memory (OOM) Errors**: Protects against crashes when RAM is exhausted
- **Run Memory-Intensive Applications**: Allows compilation, image processing, or databases
- **Improve Multitasking**: System remains responsive under memory pressure
- **Enable Hibernation**: Required for suspend-to-disk (if configured)

**Note**: While swap helps, it's much slower than RAM. Don't rely on it for performance-critical operations.

## Prerequisites

- Raspberry Pi with Raspbian/Raspberry Pi OS
- Root or sudo access
- Free disk space (recommended: 1-2GB for swap)
- SD card with wear leveling (swap causes more writes)

## Step 1: Check Current Swap Status

First, verify if swap is already configured:

```bash
sudo swapon --show
```

**Expected output:**
- If swap exists: Shows swap file/partition details (name, size, usage)
- If no swap: No output (empty)

You can also check with:

```bash
free -h
```

Look at the "Swap" row. If it shows 0B, no swap is configured.

## Step 2: Create Swap File

Create a 1GB swap file using `fallocate`:

```bash
sudo fallocate -l 1G /swapfile
```

**Command breakdown:**
- `fallocate`: Quickly allocates disk space
- `-l 1G`: Size of the swap file (1 gigabyte)
- `/swapfile`: Location and name of the swap file

**Choosing swap size:**
- **512MB RAM or less**: 1-2GB swap
- **1GB RAM**: 1GB swap
- **2GB RAM**: 512MB-1GB swap
- **4GB+ RAM**: 512MB or none

**Alternative method** (if fallocate doesn't work):

```bash
sudo dd if=/dev/zero of=/swapfile bs=1M count=1024
```

This creates a 1GB file (1024 blocks × 1MB each).

## Step 3: Verify File Creation

Check that the swap file was created with the correct size:

```bash
ls -lh /swapfile
```

**Expected output:**
```
-rw-r--r-- 1 root root 1.0G Dec 29 17:30 /swapfile
```

The file should be exactly 1GB.

## Step 4: Set Correct Permissions

**Critical security step!** Swap files must be readable only by root to prevent information leaks:

```bash
sudo chmod 600 /swapfile
```

Verify the permissions changed:

```bash
ls -lh /swapfile
```

**Expected output:**
```
-rw------- 1 root root 1.0G Dec 29 17:30 /swapfile
```

Notice the permissions are now `600` (only root can read/write).

**Why this matters:** Swap may contain sensitive data from memory (passwords, encryption keys). Wrong permissions could expose this data to other users.

## Step 5: Format as Swap

Set up the file as swap space:

```bash
sudo mkswap /swapfile
```

**Expected output:**
```
Setting up swapspace version 1, size = 1024 MiB (1073737728 bytes)
no label, UUID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

This formats the file with the swap signature and metadata.

## Step 6: Enable Swap

Activate the swap file:

```bash
sudo swapon /swapfile
```

The swap is now active! Verify it:

```bash
sudo swapon --show
```

**Expected output:**
```
NAME      TYPE SIZE USED PRIO
/swapfile file   1G   0B   -2
```

Or check with:

```bash
free -h
```

You should see swap space listed under the "Swap" row.

## Step 7: Make Swap Permanent

The swap file will be lost on reboot unless you add it to `/etc/fstab`.

Back up fstab first:

```bash
sudo cp /etc/fstab /etc/fstab.backup
```

Add the swap file to fstab:

```bash
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Verify it was added:

```bash
tail -1 /etc/fstab
```

**Expected output:**
```
/swapfile none swap sw 0 0
```

Now swap will automatically activate on boot.

## Step 8: Adjust Swappiness (Optional)

Swappiness controls how aggressively the kernel uses swap. Value range: 0-100.

Check current swappiness:

```bash
cat /proc/sys/vm/swappiness
```

**Default**: Usually 60

**Recommended for Raspberry Pi:**
- **10**: Prefer RAM, use swap only when necessary (recommended for SD cards)
- **60**: Default balanced behavior
- **100**: Aggressively use swap

Set swappiness temporarily (lost on reboot):

```bash
sudo sysctl vm.swappiness=10
```

Make it permanent:

```bash
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
```

**Why lower swappiness on Pi:**
- Reduces SD card wear (fewer write cycles)
- Improves performance (RAM is much faster)
- Only uses swap when truly needed

## Step 9: Adjust Cache Pressure (Optional)

Cache pressure determines how aggressively the kernel reclaims inode and dentry caches.

Check current value:

```bash
cat /proc/sys/vm/vfs_cache_pressure
```

**Default**: 100

Set a lower value to keep more file system cache in memory:

```bash
sudo sysctl vm.vfs_cache_pressure=50
```

Make it permanent:

```bash
echo 'vm.vfs_cache_pressure=50' | sudo tee -a /etc/sysctl.conf
```

## Verification

Test that everything is working correctly:

### Check Swap Status

```bash
# Show swap devices
sudo swapon --show

# Show memory and swap usage
free -h

# Show detailed memory info
cat /proc/meminfo | grep -i swap
```

### Test Swap Under Load

Create artificial memory pressure to force swap usage:

```bash
# Install stress tool
sudo apt-get install stress

# Run memory stress test (use 90% of RAM)
stress --vm 1 --vm-bytes $(awk '/MemAvailable/{printf "%d\n", $2 * 0.9;}' < /proc/meminfo)k --timeout 30s
```

Monitor swap usage during the test:

```bash
watch -n 1 free -h
```

You should see the "Swap" usage increase.

## Troubleshooting

### Swap Not Activating on Boot

**Check fstab entry:**
```bash
cat /etc/fstab | grep swap
```

**Test fstab manually:**
```bash
sudo swapoff /swapfile
sudo swapon -a  # Activates all swap in fstab
sudo swapon --show
```

### "fallocate: fallocate failed: Operation not supported"

Some filesystems don't support fallocate. Use `dd` instead:

```bash
sudo dd if=/dev/zero of=/swapfile bs=1M count=1024 status=progress
```

### Swap File Too Large for SD Card

Reduce swap size:

```bash
# Remove existing swap
sudo swapoff /swapfile
sudo rm /swapfile

# Create smaller swap (512MB)
sudo fallocate -l 512M /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### System Still Running Out of Memory

- **Increase swap size**: Follow removal steps, then create larger swap
- **Reduce swappiness**: Set to 10 or lower
- **Close unnecessary services**: Free up RAM
- **Add more physical RAM**: Consider upgrading Pi model

### SD Card Wearing Out Quickly

Swap causes many write cycles. To reduce wear:

1. **Lower swappiness to 10**
2. **Use USB storage for swap** instead of SD card:
   ```bash
   sudo fallocate -l 1G /media/usb/swapfile
   # Follow same steps but use USB path
   ```
3. **Monitor SD card health** regularly

## Managing Swap

### Disable Swap Temporarily

```bash
sudo swapoff /swapfile
```

### Re-enable Swap

```bash
sudo swapon /swapfile
```

### Remove Swap Completely

```bash
# Disable swap
sudo swapoff /swapfile

# Remove fstab entry
sudo sed -i '/\/swapfile/d' /etc/fstab

# Delete swap file
sudo rm /swapfile
```

### Resize Swap

To change swap size, you must remove and recreate it:

```bash
# Disable current swap
sudo swapoff /swapfile

# Remove old swap file
sudo rm /swapfile

# Create new swap with desired size (e.g., 2GB)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Verify
sudo swapon --show
```

## Performance Monitoring

Monitor swap usage over time:

```bash
# Real-time monitoring
watch -n 2 'free -h && echo && swapon --show'

# Check swap I/O
iostat -x 2

# View processes using swap
for file in /proc/*/status ; do awk '/VmSwap|Name/{printf $2 " " $3}END{ print ""}' $file; done | sort -k 2 -n -r | head -10
```

## Alternative: Using zram Instead

For better performance and less SD card wear, consider zram (compressed RAM):

```bash
# Install zram tools
sudo apt install zram-tools

# Configure zram
echo 'ALGO=lz4' | sudo tee -a /etc/default/zramswap
echo 'PERCENT=50' | sudo tee -a /etc/default/zramswap

# Start zram
sudo systemctl start zramswap

# Enable on boot
sudo systemctl enable zramswap
```

Zram compresses memory in RAM itself, avoiding slow disk I/O and SD card wear.

## Quick Reference

```bash
# Check swap status
sudo swapon --show
free -h

# Create 1GB swap
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Optimize for SD card
sudo sysctl vm.swappiness=10
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf

# Disable swap
sudo swapoff /swapfile

# Enable swap
sudo swapon /swapfile
```
