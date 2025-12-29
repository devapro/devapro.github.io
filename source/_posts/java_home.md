---
title: How to Set JAVA_HOME Environment Variable
lang: en
categories:
  - Linux
date: 2025-12-29 17:45:00
tags:
  - linux
  - java
  - macOS
excerpt:
  - Quick guide to setting JAVA_HOME environment variable on Linux, macOS, and Windows
---

JAVA_HOME is an environment variable that points to your Java installation directory. Many Java-based applications and build tools (Maven, Gradle, Tomcat) require this variable to be set correctly.

## Why Set JAVA_HOME?

- **Required by build tools**: Maven, Gradle, and Ant need it to find Java
- **Application servers**: Tomcat, JBoss, and others use it
- **IDE compatibility**: Ensures consistent Java version across tools
- **Script automation**: Makes Java location consistent across systems

## Finding Your Java Installation

### Linux

```bash
# Find Java installation path
which java

# Get full path (follows symlinks)
readlink -f $(which java)

# Or use update-alternatives
update-alternatives --list java
```

Common locations:
- `/usr/lib/jvm/java-11-openjdk-amd64`
- `/usr/lib/jvm/java-17-openjdk-amd64`
- `/usr/java/jdk-17.0.1`

### macOS

```bash
# Find Java home using java_home utility
/usr/libexec/java_home

# List all installed Java versions
/usr/libexec/java_home -V

# Get path for specific version
/usr/libexec/java_home -v 17
```

Common locations:
- `/Library/Java/JavaVirtualMachines/jdk-17.jdk/Contents/Home`
- `/Applications/Android Studio.app/Contents/jbr/Contents/Home`

### Windows

```cmd
# From Command Prompt
where java

# From PowerShell
(Get-Command java).Path
```

Common locations:
- `C:\Program Files\Java\jdk-17`
- `C:\Program Files\OpenJDK\jdk-17.0.1`
- `C:\Program Files\Eclipse Adoptium\jdk-17.0.1-hotspot`

## Setting JAVA_HOME

### Linux

#### Temporary (Current Session Only)

```bash
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH=$PATH:$JAVA_HOME/bin
```

#### Permanent (All Sessions)

Add to `~/.bashrc` or `~/.zshrc`:

```bash
# Open your shell config file
nano ~/.bashrc  # or ~/.zshrc for Zsh

# Add these lines at the end
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH=$PATH:$JAVA_HOME/bin

# Save and reload
source ~/.bashrc  # or source ~/.zshrc
```

#### System-wide (All Users)

Create a file in `/etc/profile.d/`:

```bash
# Create environment file
sudo nano /etc/profile.d/java.sh

# Add this content
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH=$PATH:$JAVA_HOME/bin

# Make it executable
sudo chmod +x /etc/profile.d/java.sh

# Reload
source /etc/profile.d/java.sh
```

### macOS

#### Using Shell Configuration

Add to `~/.zshrc` (default shell on modern macOS):

```bash
# Open Zsh config
nano ~/.zshrc

# Add these lines
export JAVA_HOME=$(/usr/libexec/java_home)
export PATH=$JAVA_HOME/bin:$PATH

# Save and reload
source ~/.zshrc
```

#### For Specific Java Version

```bash
# Java 17
export JAVA_HOME=$(/usr/libexec/java_home -v 17)

# Java 11
export JAVA_HOME=$(/usr/libexec/java_home -v 11)

# Java 1.8
export JAVA_HOME=$(/usr/libexec/java_home -v 1.8)
```

#### For Android Studio's JDK

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export PATH=$JAVA_HOME/bin:$PATH
```

### Windows

#### Using System Properties (GUI)

1. Open **Start Menu**, search for "Environment Variables"
2. Click **Edit the system environment variables**
3. Click **Environment Variables** button
4. Under **System variables**, click **New**
5. Set:
   - Variable name: `JAVA_HOME`
   - Variable value: `C:\Program Files\Java\jdk-17` (your Java path)
6. Click **OK**
7. Find **Path** variable, click **Edit**
8. Click **New** and add: `%JAVA_HOME%\bin`
9. Click **OK** on all dialogs
10. Restart any open Command Prompts

#### Using Command Prompt (Admin)

```cmd
setx JAVA_HOME "C:\Program Files\Java\jdk-17" /M
setx PATH "%PATH%;%JAVA_HOME%\bin" /M
```

**Note**: `/M` sets system-wide. Remove it for user-only.

#### Using PowerShell (Admin)

```powershell
[System.Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Java\jdk-17", "Machine")
$path = [System.Environment]::GetEnvironmentVariable("PATH", "Machine")
[System.Environment]::SetEnvironmentVariable("PATH", "$path;%JAVA_HOME%\bin", "Machine")
```

## Verify Installation

After setting JAVA_HOME, verify it's working:

### Linux/macOS

```bash
# Check JAVA_HOME value
echo $JAVA_HOME

# Verify Java is accessible
java -version

# Verify javac (compiler) is accessible
javac -version

# Full test
$JAVA_HOME/bin/java -version
```

Expected output:
```
openjdk version "17.0.1" 2021-10-19
OpenJDK Runtime Environment (build 17.0.1+12)
OpenJDK 64-Bit Server VM (build 17.0.1+12, mixed mode)
```

### Windows

```cmd
# Check JAVA_HOME value
echo %JAVA_HOME%

# Verify Java is accessible
java -version

# Verify javac (compiler) is accessible
javac -version
```

## Common Issues

### "JAVA_HOME is not defined"

**Solution**: Ensure you've reloaded your shell or restarted your terminal after setting the variable.

```bash
# Linux/macOS - reload config
source ~/.bashrc  # or ~/.zshrc

# Windows - restart Command Prompt/PowerShell
```

### "command not found: java" after setting JAVA_HOME

**Solution**: Make sure you also added `$JAVA_HOME/bin` to your PATH.

```bash
# Check if JAVA_HOME/bin is in PATH
echo $PATH | grep "$JAVA_HOME"

# If not, add it
export PATH=$PATH:$JAVA_HOME/bin
```

### Wrong Java version being used

**Solution**: Check if multiple Java installations exist and PATH order.

```bash
# Find all Java locations
which -a java

# Check PATH order
echo $PATH

# Ensure JAVA_HOME/bin appears early in PATH
export PATH=$JAVA_HOME/bin:$PATH  # Note: JAVA_HOME/bin comes FIRST
```

### Maven/Gradle still can't find Java

**Solution**: Some tools need explicit JAVA_HOME. Verify the path points to JDK, not JRE:

```bash
# Should show JDK directory with 'bin', 'lib', 'include', etc.
ls $JAVA_HOME

# Must contain javac (Java compiler)
ls $JAVA_HOME/bin/javac
```

## Multiple Java Versions

If you need to switch between Java versions:

### Linux - Using update-alternatives

```bash
# List available Java versions
sudo update-alternatives --config java

# Select the version you want by entering the number
```

### macOS - Using jenv

```bash
# Install jenv
brew install jenv

# Add to shell config
echo 'export PATH="$HOME/.jenv/bin:$PATH"' >> ~/.zshrc
echo 'eval "$(jenv init -)"' >> ~/.zshrc

# Add Java versions
jenv add /Library/Java/JavaVirtualMachines/jdk-11.jdk/Contents/Home
jenv add /Library/Java/JavaVirtualMachines/jdk-17.jdk/Contents/Home

# Set global version
jenv global 17

# Set local version (project-specific)
cd your-project
jenv local 11
```

### Windows - Manual switching

Create batch files for each version:

**java11.bat:**
```cmd
@echo off
setx JAVA_HOME "C:\Program Files\Java\jdk-11" /M
echo Java 11 is now active
```

**java17.bat:**
```cmd
@echo off
setx JAVA_HOME "C:\Program Files\Java\jdk-17" /M
echo Java 17 is now active
```

## Quick Reference

### Linux/macOS

```bash
# Set JAVA_HOME temporarily
export JAVA_HOME=/path/to/java
export PATH=$JAVA_HOME/bin:$PATH

# Set JAVA_HOME permanently (add to ~/.bashrc or ~/.zshrc)
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH=$JAVA_HOME/bin:$PATH

# Verify
echo $JAVA_HOME
java -version
```

### Windows (Command Prompt)

```cmd
# Set JAVA_HOME permanently (run as Admin)
setx JAVA_HOME "C:\Program Files\Java\jdk-17" /M
setx PATH "%PATH%;%JAVA_HOME%\bin" /M

# Verify (restart CMD first)
echo %JAVA_HOME%
java -version
```

### macOS with Android Studio JDK

```bash
# Add to ~/.zshrc
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export PATH=$JAVA_HOME/bin:$PATH

# Reload
source ~/.zshrc
```

## Additional Environment Variables

If you're also developing Android apps, you might need:

```bash
# Android SDK
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools

# Or on Linux
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
```

For Node.js version management with NVM:

```bash
# Add to ~/.bashrc or ~/.zshrc
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
```

## Conclusion

Setting JAVA_HOME correctly ensures your Java development tools work smoothly. Remember to:
- Use the JDK directory, not JRE
- Add `$JAVA_HOME/bin` to your PATH
- Reload your shell after making changes
- Verify with `java -version` and `echo $JAVA_HOME`

For projects requiring specific Java versions, consider using version managers like jenv (macOS/Linux) or SDKMAN! (all platforms).
