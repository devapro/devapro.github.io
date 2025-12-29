---
title: Complete Disk Backup and Restore with dd Command
lang: en
categories:
  - Linux
tags:
  - linux
  - dd
  - backup
  - recovery
translations:
  ru: polnaya-rezervnaya-kopiya-diska-dd
excerpt:
  - Complete guide to creating and restoring full disk backups using dd utility with compression and verification
date: 2020-06-24 15:27:40
---

The `dd` command is a powerful Linux utility for creating exact bit-by-bit copies of disks, partitions, or files. This guide covers how to safely create full disk backups and restore them when needed.

## ⚠️ Important Safety Warning

**dd is dangerous!** A single typo can permanently destroy your data. Always:
- Double-check your input (`if=`) and output (`of=`) devices
- Ensure you're backing up the correct disk
- Never run dd on a mounted filesystem
- Keep backups on a separate physical drive
- Test your backups before you need them

The `dd` command is nicknamed "disk destroyer" for good reason—use it carefully!

## Prerequisites

- Root or sudo access
- Sufficient disk space for backup (at least equal to source disk size)
- External drive or network storage for backup storage
- Basic understanding of Linux disk naming (/dev/sda, /dev/sdb, etc.)

## Finding Your Disks

### List All Disks

```bash
# List all disks and partitions
sudo fdisk -l

# Or use lsblk for a tree view
lsblk

# Check disk usage
df -h
```

**Understanding disk names:**
- `/dev/sda` - First SATA/SCSI disk (entire disk)
- `/dev/sda1` - First partition on first disk
- `/dev/nvme0n1` - First NVMe SSD
- `/dev/mmcblk0` - SD card
- `/dev/sdb` - Second disk (usually external USB)

**Important:** Back up the entire disk (e.g., `/dev/sda`), not just a partition (e.g., `/dev/sda1`). This ensures bootloader and partition table are included.

### Identify Your Source Disk

```bash
# Check mounted disks
mount | grep "^/dev"

# Get detailed disk information
sudo fdisk -l /dev/sda
```

## Creating a Disk Backup

### Basic Disk to Image Backup

Create a complete disk image file:

```bash
# Backup entire disk to image file
sudo dd if=/dev/sda of=/path/to/backup/full_disk_backup.img bs=4M status=progress
```

**Parameters explained:**
- `if=/dev/sda` - Input file (source disk to backup)
- `of=full_disk_backup.img` - Output file (backup image)
- `bs=4M` - Block size of 4 megabytes (faster than default)
- `status=progress` - Shows progress during copy

**Example with real paths:**
```bash
# Backup to external USB drive
sudo dd if=/dev/sda of=/media/usb/backups/laptop_backup_2025-12-29.img bs=4M status=progress
```

### Direct Disk to Disk Backup

Clone one disk directly to another (faster, no intermediate file):

```bash
# Copy disk /dev/sda to disk /dev/sdb
sudo dd if=/dev/sda of=/dev/sdb bs=4M status=progress
```

**Warning:** This will completely erase `/dev/sdb`! Triple-check your device names!

### Compressed Backup (Saves Space)

Compress the backup on-the-fly using gzip or pigz:

```bash
# Compress with gzip (slower, better compression)
sudo dd if=/dev/sda bs=4M status=progress | gzip -c > /path/to/backup/disk_backup.img.gz

# Compress with pigz (parallel gzip, faster on multi-core CPUs)
sudo dd if=/dev/sda bs=4M status=progress | pigz -c > /path/to/backup/disk_backup.img.gz

# Lower compression for speed (level 1-9, default 6)
sudo dd if=/dev/sda bs=4M status=progress | gzip -1 > /path/to/backup/disk_backup.img.gz
```

**Compression comparison:**
- No compression: Fastest, but huge file (entire disk size)
- gzip -9: Slowest, smallest file (~30-50% reduction)
- pigz -1: Good balance of speed and size

### Backup Only Used Space (with dd_rescue)

For large disks with little data, use `ddrescue` to skip empty blocks:

```bash
# Install ddrescue
sudo apt install gddrescue

# Backup with intelligent copying
sudo ddrescue -f -n /dev/sda /path/to/backup/disk_backup.img /path/to/backup/disk_backup.log
```

## Optimizing dd Performance

### Choosing Block Size

Block size affects speed significantly:

```bash
# Too small (slow)
bs=512    # 512 bytes - very slow

# Good choices (fast)
bs=4M     # 4 megabytes - good default
bs=8M     # 8 megabytes - faster for large disks
bs=16M    # 16 megabytes - fastest, but uses more RAM

# Separate read/write sizes
bs=4M conv=sync,noerror  # Continue on read errors
```

**Recommendation:** Use `bs=4M` for most cases, `bs=8M` or `bs=16M` for very large disks.

### Monitor Progress

If you forgot `status=progress`, monitor dd in another terminal:

```bash
# Find dd process ID
ps aux | grep dd

# Send USR1 signal to show progress
sudo kill -USR1 <pid>

# Or use this one-liner
watch -n 5 'sudo kill -USR1 $(pgrep ^dd$)'
```

### Speed Test

Benchmark your disk before backing up:

```bash
# Write speed test (creates 1GB test file)
dd if=/dev/zero of=/path/to/testfile bs=1M count=1024 oflag=direct

# Read speed test
dd if=/path/to/testfile of=/dev/null bs=1M count=1024 iflag=direct

# Clean up
rm /path/to/testfile
```

## Restoring from Backup

### Restore Image to Disk

```bash
# Restore uncompressed image
sudo dd if=/path/to/backup/full_disk_backup.img of=/dev/sdb bs=4M status=progress

# Restore compressed image (gzip)
gunzip -c /path/to/backup/disk_backup.img.gz | sudo dd of=/dev/sdb bs=4M status=progress

# Restore compressed image (pigz)
pigz -dc /path/to/backup/disk_backup.img.gz | sudo dd of=/dev/sdb bs=4M status=progress
```

**Critical reminders:**
- `/dev/sdb` will be completely overwritten
- Unmount the target disk first
- For boot disks, connect only ONE boot disk at a time
- Verify device names with `lsblk` before running

### Restore Specific Partition

To restore just one partition:

```bash
# Backup single partition
sudo dd if=/dev/sda1 of=/path/to/backup/partition_backup.img bs=4M status=progress

# Restore single partition
sudo dd if=/path/to/backup/partition_backup.img of=/dev/sdb1 bs=4M status=progress
```

## Verification

Always verify your backups!

### Compare Backup to Original

```bash
# Calculate checksums
md5sum /dev/sda > original.md5
md5sum /path/to/backup/disk_backup.img > backup.md5

# Compare
diff original.md5 backup.md5

# Or use cmp for bit-by-bit comparison
sudo cmp /dev/sda /path/to/backup/disk_backup.img
```

### Mount and Test Backup

```bash
# Create loop device from backup
sudo losetup -f -P /path/to/backup/disk_backup.img

# Check which loop device was created
sudo losetup -a

# Mount partition from backup (assume /dev/loop0p1)
sudo mkdir /mnt/backup_test
sudo mount /dev/loop0p1 /mnt/backup_test

# Browse backup
ls /mnt/backup_test

# Unmount and cleanup
sudo umount /mnt/backup_test
sudo losetup -d /dev/loop0
```

## Safety Best Practices

### Before Creating Backup

```bash
# 1. Unmount the source if possible
sudo umount /dev/sda1

# 2. Check available space on destination
df -h /path/to/backup

# 3. Test destination is writable
touch /path/to/backup/test && rm /path/to/backup/test

# 4. Double-check device names
lsblk
```

### Before Restoring Backup

```bash
# 1. List all disks to confirm target
lsblk

# 2. Unmount target disk
sudo umount /dev/sdb*

# 3. Confirm you have the right backup
ls -lh /path/to/backup/

# 4. TRIPLE CHECK device names!
echo "Restoring to: /dev/sdb"
echo "Press Ctrl+C to cancel or Enter to continue"
read
```

## Common Use Cases

### Backup Before System Upgrade

```bash
# Backup boot disk before major upgrade
sudo dd if=/dev/sda of=/media/external/pre-upgrade-backup.img bs=4M status=progress
```

### Clone Disk to Larger Disk

```bash
# 1. Clone to larger disk
sudo dd if=/dev/sda of=/dev/sdb bs=4M status=progress

# 2. Expand partition to use new space
sudo parted /dev/sdb
(parted) print free
(parted) resizepart 2 100%
(parted) quit

# 3. Resize filesystem
sudo resize2fs /dev/sdb2  # For ext4
# or
sudo xfs_growfs /dev/sdb2  # For XFS
```

### Backup SD Card (Raspberry Pi)

```bash
# Find SD card device (usually /dev/mmcblk0 or /dev/sdb)
lsblk

# Backup SD card
sudo dd if=/dev/mmcblk0 of=~/backups/raspberrypi_backup.img bs=4M status=progress

# Compress
gzip ~/backups/raspberrypi_backup.img

# Restore to new SD card
gunzip -c ~/backups/raspberrypi_backup.img.gz | sudo dd of=/dev/mmcblk0 bs=4M status=progress
```

### Create Bootable USB from ISO

```bash
# Copy ISO to USB drive
sudo dd if=~/Downloads/ubuntu-24.04.iso of=/dev/sdb bs=4M status=progress oflag=sync
```

## Troubleshooting

### "No space left on device"

**Problem:** Destination doesn't have enough space.

**Solution:**
```bash
# Check available space
df -h /path/to/backup

# Use compression to reduce size
sudo dd if=/dev/sda bs=4M | gzip > backup.img.gz

# Or backup to network drive
sudo dd if=/dev/sda bs=4M | ssh user@server 'cat > /backups/disk.img'
```

### "Device is busy"

**Problem:** Disk is mounted or in use.

**Solution:**
```bash
# Check what's using the device
sudo lsof | grep /dev/sda

# Unmount all partitions
sudo umount /dev/sda*

# Force unmount if needed
sudo umount -l /dev/sda1
```

### "Operation not permitted"

**Problem:** Insufficient permissions.

**Solution:**
```bash
# Run with sudo
sudo dd ...

# Check if disk is write-protected
hdparm -r /dev/sda
```

### dd Seems Stuck

**Problem:** No progress visible.

**Solution:**
```bash
# Check if dd is actually running
ps aux | grep dd

# Send signal to show progress
sudo kill -USR1 $(pgrep ^dd$)

# Monitor I/O
iostat -x 2
```

### Backup File Too Large

**Problem:** Image file is huge.

**Solution:**
```bash
# Use compression
sudo dd if=/dev/sda bs=4M | gzip -1 > backup.img.gz

# Or backup only used blocks with partclone
sudo partclone.ext4 -c -s /dev/sda1 -o backup.partclone

# Or use rsync for incremental backups
sudo rsync -aAXv --delete / /media/backup/
```

## Alternative Tools

While `dd` is powerful, consider these alternatives for specific needs:

**For system backups:**
- `rsync` - Incremental backups, faster than dd for used space only
- `tar` - Archive specific directories
- `Clonezilla` - GUI tool, intelligent cloning
- `timeshift` - System snapshots (like macOS Time Machine)

**For disk cloning:**
- `ddrescue` - Recovers data from failing disks
- `partclone` - Copies only used blocks (smaller backups)
- `fsarchiver` - Filesystem-level backup

**For disk imaging:**
- `partimage` - Creates partition images
- `g4u` - Ghost for Unix
- `redo rescue` - Live CD for backups

## Quick Reference

```bash
# Basic backup
sudo dd if=/dev/sda of=backup.img bs=4M status=progress

# Compressed backup
sudo dd if=/dev/sda bs=4M | gzip > backup.img.gz

# Direct clone
sudo dd if=/dev/sda of=/dev/sdb bs=4M status=progress

# Restore from backup
sudo dd if=backup.img of=/dev/sdb bs=4M status=progress

# Restore from compressed backup
gunzip -c backup.img.gz | sudo dd of=/dev/sdb bs=4M status=progress

# Show progress of running dd
sudo kill -USR1 $(pgrep ^dd$)

# Verify backup
md5sum /dev/sda backup.img

# Mount backup image
sudo losetup -f -P backup.img
sudo mount /dev/loop0p1 /mnt/test
```

## Conclusion

The `dd` command is an essential tool for complete disk backups and disaster recovery. Key takeaways:

- Always verify device names before running dd
- Use compression to save space (`gzip` or `pigz`)
- Add `status=progress` to monitor progress
- Test your backups before you need them
- Keep backups on separate physical drives
- Consider alternatives like `rsync` for incremental backups

Remember: dd is powerful but dangerous. One wrong command can destroy your data permanently. Always double-check your commands before pressing Enter!
