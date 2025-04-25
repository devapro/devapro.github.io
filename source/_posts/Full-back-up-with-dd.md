---
title: Full back up with dd
categories:
  - Linux
tags:
  - linux
  - dd
excerpt:
  - Creating and restoring full back up boot disk with dd util
date: 2020-06-24 15:27:40
---

## How to create disk back up

View all disks

``` bash
sudo fdisk -l
```

then create .img file with back up (for example use disk /dev/sda)
important creating backup for full disk, not for partion of disk

``` bash
sudo dd if=/dev/sda of=./full_disk_backup.img bs=4M status=progress
```

or we can copy disk to another disk

```bash
sudo dd if=/dev/sda of=/dev/sde bs=4M status=progress
```

bs=4M - for speed copy, but you can set 128K or 1024K
status=progress - for showing work progress

## Restore from backup

Just:

``` bash
sudo dd if=./full_disk_backup.img of=/dev/sde bs=4M status=progress
```

If you created boot disk backup, connect only one boot disk at the time.