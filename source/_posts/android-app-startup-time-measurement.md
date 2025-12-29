---
title: How to Measure Android App Start-up Time
lang: en
categories:
  - Android
  - Performance
tags:
  - android
  - performance
  - optimization
  - testing
  - adb
date: 2025-12-29 18:30:00
excerpt:
  - Complete guide to measuring Android app startup performance using logcat and benchmark tools for optimization
---

App startup time is one of the most critical metrics for user experience. Users expect apps to launch quickly, and slow startup times directly correlate with user frustration, negative reviews, and app uninstalls. This guide covers how to accurately measure and track Android app startup performance.

## Why Startup Time Matters

**User Experience Impact:**
- First impression of app quality
- Directly affects user retention
- Critical for app store ratings
- Competitive advantage in crowded markets

**Google's Recommendations:**
- **Cold start**: Should complete in < 5 seconds
- **Warm start**: Should complete in < 2 seconds
- **Hot start**: Should complete in < 1.5 seconds

**Business Impact:**
- 1-second delay = 7% reduction in conversions
- 53% of users abandon apps that take > 3 seconds to load
- App store rankings consider startup performance

## Understanding Startup Types

### Cold Start

**What it is:** App launched from scratch with no cached data

**When it happens:**
- First launch after device boot
- App killed by system
- User force-stopped the app

**What's measured:**
- Process creation
- Application.onCreate()
- First Activity creation and layout
- First frame drawn

**This is the most important metric** - represents worst-case scenario.

### Warm Start

**What it is:** App process exists but Activity was destroyed

**When it happens:**
- User pressed back button (Activity destroyed but process alive)
- System reclaimed Activity due to memory pressure

**What's measured:**
- Activity recreation
- Layout inflation
- First frame drawn

### Hot Start

**What it is:** App already in memory, just brought to foreground

**When it happens:**
- User returns from recent apps
- User pressed home and returns quickly

**What's measured:**
- Activity.onStart()
- Activity.onResume()
- Minimal work

## Measurement Guidelines

### What to Measure

**Focus on Time to Initial Display (TTID):**
- From app launch to first visible frame
- Excludes asynchronous data loading
- Represents perceived startup time

**Not included:**
- Network requests (unless blocking UI)
- Background work that doesn't block rendering
- Splash screen animations (measure separately)

### Best Practices

**1. Minimize External Factors**

```kotlin
// ❌ BAD: Network calls in Application.onCreate()
class MyApp : Application() {
    override fun onCreate() {
        super.onCreate()
        fetchRemoteConfig() // Blocks startup!
        initializeAnalytics().await() // Blocks startup!
    }
}

// ✅ GOOD: Defer non-critical work
class MyApp : Application() {
    override fun onCreate() {
        super.onCreate()
        // Critical initialization only
        initializeCrashReporting() // Fast, synchronous

        // Defer everything else
        lifecycleScope.launch {
            fetchRemoteConfig()
            initializeAnalytics()
        }
    }
}
```

**2. Account for Device Variables**

Factors affecting measurements:
- CPU frequency and cores
- Available RAM
- System load (background apps)
- Android version
- Device thermal state

**Solution:** Test on multiple devices representing your user base.

**3. Track Relative Changes**

Instead of absolute times:
- Measure before/after optimization
- Track percentage improvement
- Compare across app versions
- Monitor trends over time

**Example:**
- Before: 1.2s average startup
- After optimization: 0.9s average
- **Result: 25% improvement** ← This is meaningful!

## Method 1: ActivityManager via Logcat

The simplest and most common method using Android's built-in logging.

### Basic Measurement

**Step 1: Clear Logcat**

```bash
adb logcat -c
```

**Step 2: Launch Your App**

```bash
adb shell am start-activity -W -n com.example.myapp/.MainActivity
```

**Parameters explained:**
- `-W`: Wait for launch to complete
- `-n`: Component name (package/activity)

**Step 3: View Results**

```bash
adb logcat | grep "Displayed"
```

**Sample output:**

```
ActivityManager: Displayed com.example.myapp/.MainActivity: +856ms
```

This shows your app took **856ms** from launch to first frame.

### Cold Start Measurement

To ensure a true cold start:

```bash
# 1. Force stop app
adb shell am force-stop com.example.myapp

# 2. Clear app data (optional but recommended)
adb shell pm clear com.example.myapp

# 3. Wait a moment for system to settle
sleep 2

# 4. Clear logcat
adb logcat -c

# 5. Launch app
adb shell am start-activity -W -n com.example.myapp/.MainActivity

# 6. Get results
adb logcat | grep "Displayed"
```

### Filtering for Specific Activity

If your app has multiple activities:

```bash
# Only show results for SplashActivity
adb logcat | grep "Displayed.*SplashActivity"
```

This ensures you're measuring the first activity only, not subsequent navigations.

### Full Bash Script

Save as `measure_startup.sh`:

```bash
#!/bin/bash

PACKAGE="com.example.myapp"
ACTIVITY=".MainActivity"
RUNS=10

echo "Measuring cold start time for $PACKAGE"
echo "Running $RUNS iterations..."
echo ""

total=0

for i in $(seq 1 $RUNS); do
    echo "Run $i/$RUNS..."

    # Force stop app
    adb shell am force-stop $PACKAGE

    # Clear app data
    adb shell pm clear $PACKAGE > /dev/null 2>&1

    # Wait for system to settle
    sleep 2

    # Clear logcat
    adb logcat -c

    # Launch app and capture time
    adb shell am start-activity -W -n $PACKAGE$ACTIVITY > /dev/null 2>&1

    # Extract startup time
    time=$(adb logcat -d | grep "Displayed $PACKAGE" | tail -1 | grep -oE '\+[0-9]+ms' | grep -oE '[0-9]+')

    if [ -n "$time" ]; then
        echo "  Time: ${time}ms"
        total=$((total + time))
    else
        echo "  Failed to get time"
    fi

    echo ""
done

average=$((total / RUNS))
echo "Average cold start time: ${average}ms"
```

**Usage:**

```bash
chmod +x measure_startup.sh
./measure_startup.sh
```

**Sample output:**

```
Measuring cold start time for com.example.myapp
Running 10 iterations...

Run 1/10...
  Time: 892ms

Run 2/10...
  Time: 856ms

Run 3/10...
  Time: 901ms

...

Average cold start time: 873ms
```

## Method 2: Android Benchmark Plugin

More sophisticated approach using androidx.benchmark for precise measurements.

### Setup

**Step 1: Add Dependencies**

In `app/build.gradle`:

```gradle
dependencies {
    // Benchmark library
    androidTestImplementation "androidx.benchmark:benchmark-junit4:1.2.0"
}

android {
    defaultConfig {
        testInstrumentationRunner "androidx.benchmark.junit4.AndroidBenchmarkRunner"
    }
}
```

**Step 2: Configure Benchmark**

Create `app/src/androidTest/AndroidManifest.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application>
        <!-- Declare benchmark activity -->
        <activity android:name="androidx.benchmark.macro.MacrobenchmarkActivity" />
    </application>
</manifest>
```

**Step 3: Create Benchmark Test**

`app/src/androidTest/java/com/example/StartupBenchmark.kt`:

```kotlin
@RunWith(AndroidJUnit4::class)
class StartupBenchmark {

    @get:Rule
    val benchmarkRule = MacrobenchmarkRule()

    @Test
    fun startup() = benchmarkRule.measureRepeated(
        packageName = "com.example.myapp",
        metrics = listOf(StartupTimingMetric()),
        iterations = 10,
        startupMode = StartupMode.COLD,
        setupBlock = {
            // Clear app data before each iteration
            pressHome()
        }
    ) {
        // Launch app
        startActivityAndWait()
    }
}
```

### Running Benchmark

```bash
# Run benchmark test
./gradlew :app:connectedAndroidTest

# Results are saved to:
# app/build/outputs/androidTest-results/
```

**Sample output:**

```
StartupBenchmark_startup
  timeToInitialDisplayMs   min 789.2,   median 856.1,   max 943.7
```

**Benefits over logcat method:**
- Statistical analysis (min, median, max, percentiles)
- Automatic iteration handling
- Consistent environment control
- Integration with CI/CD pipelines

### Command-Line Benchmark

For quick measurements without writing tests:

```bash
adb shell am start-activity \
  -W \
  -a android.intent.action.VIEW \
  -n com.example.myapp/.MainActivity \
  --es "androidx.benchmark.startupMode" "COLD"
```

## Advanced: Startup Profiling

For detailed analysis of what's taking time:

### Using Android Studio Profiler

1. **Run app in debug mode**
2. **Open Profiler** (View → Tool Windows → Profiler)
3. **Click "+" and select your process**
4. **Click "CPU" and start recording**
5. **Force stop app**: `adb shell am force-stop com.example.myapp`
6. **Launch app**: App should auto-attach to profiler
7. **Stop recording after first screen appears**

**Analyze results:**
- Identify slow methods in Application.onCreate()
- Find blocking I/O operations
- Detect unnecessary initialization

### Using Systrace

For system-level analysis:

```bash
# Capture startup trace
python systrace.py -t 10 -o startup_trace.html \
  sched freq idle am wm gfx view binder_driver hal dalvik \
  camera input res &

# Launch app immediately after starting trace
sleep 1 && adb shell am start-activity -W -n com.example.myapp/.MainActivity
```

Open `startup_trace.html` in Chrome to analyze frame-by-frame rendering.

## Precision Enhancement Strategies

### 1. Clear App Data Before Each Test

```bash
adb shell pm clear com.example.myapp
```

**Why:** Ensures consistent state, removes cached data.

### 2. Run Multiple Iterations

```bash
# Run 10 times and average
for i in {1..10}; do
  # measurement code
done
```

**Why:** Accounts for variability, provides statistical confidence.

### 3. Test on Same Device

**Why:** Different devices have vastly different performance characteristics.

**Best practice:**
- Test on low-end device (represents worst case)
- Test on mid-range device (represents majority)
- Test on flagship (represents best case)

### 4. Lock CPU Frequency (Rooted Devices)

```bash
# Requires root
adb shell su -c "echo performance > /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor"
```

**Why:** Prevents thermal throttling and frequency scaling from affecting results.

### 5. Use Real Devices, Not Emulators

**Why:**
- Emulators don't accurately represent real device performance
- Missing hardware acceleration
- Different memory characteristics

**Exception:** Automated CI/CD testing (accept that times won't match real devices).

### 6. Test at Same Time of Day

**Why:** Device background services vary by time (updates, syncs, etc.).

### 7. Minimize Background Apps

```bash
# Close all apps
adb shell input keyevent KEYCODE_HOME
adb shell am broadcast -a android.intent.action.CLOSE_SYSTEM_DIALOGS

# Wait for system to settle
sleep 5
```

## Common Startup Performance Issues

### 1. Heavy Application.onCreate()

```kotlin
// ❌ BAD: Blocking operations
class MyApp : Application() {
    override fun onCreate() {
        super.onCreate()
        initDatabase() // 200ms
        setupAnalytics() // 150ms
        loadConfig() // 100ms
        // Total: 450ms added to startup!
    }
}

// ✅ GOOD: Lazy initialization
class MyApp : Application() {
    private val database by lazy { initDatabase() }
    private val analytics by lazy { setupAnalytics() }

    override fun onCreate() {
        super.onCreate()
        // Only critical crash reporting
        Firebase.initialize(this) // 50ms
    }
}
```

### 2. Synchronous I/O

```kotlin
// ❌ BAD: Reading from disk on main thread
class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val preferences = readPreferencesFromFile() // Blocks!
        setContentView(R.layout.activity_main)
    }
}

// ✅ GOOD: Async loading with placeholder
class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main) // Show UI immediately

        lifecycleScope.launch {
            val preferences = withContext(Dispatchers.IO) {
                readPreferencesFromFile()
            }
            updateUI(preferences)
        }
    }
}
```

### 3. Complex Layout Inflation

```xml
<!-- ❌ BAD: Deeply nested layouts -->
<LinearLayout>
    <RelativeLayout>
        <LinearLayout>
            <RelativeLayout>
                <!-- ... -->
            </RelativeLayout>
        </LinearLayout>
    </RelativeLayout>
</LinearLayout>

<!-- ✅ GOOD: Flat ConstraintLayout -->
<androidx.constraintlayout.widget.ConstraintLayout>
    <!-- All views at same level -->
</androidx.constraintlayout.widget.ConstraintLayout>
```

### 4. Custom Font Loading

```kotlin
// ❌ BAD: Loading fonts synchronously
val typeface = ResourcesCompat.getFont(context, R.font.custom_font)
textView.typeface = typeface

// ✅ GOOD: Use XML font families (cached by system)
<!-- res/font/custom_font_family.xml -->
<font-family>
    <font android:font="@font/custom_font" />
</font-family>

<!-- Then in layout: -->
android:fontFamily="@font/custom_font_family"
```

## Tracking Over Time

### CI/CD Integration

Add to your CI pipeline:

```yaml
# .github/workflows/measure-startup.yml
name: Measure Startup Time

on: [pull_request]

jobs:
  benchmark:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run startup benchmark
        run: ./gradlew :app:connectedAndroidTest
      - name: Upload results
        uses: actions/upload-artifact@v2
        with:
          name: benchmark-results
          path: app/build/outputs/androidTest-results/
```

### Firebase Performance Monitoring

Track startup in production:

```kotlin
class MyApp : Application() {
    override fun onCreate() {
        super.onCreate()

        val trace = Firebase.performance.newTrace("app_start")
        trace.start()

        // Your initialization code

        trace.stop()
    }
}
```

**Benefits:**
- Real user measurements
- Device distribution analysis
- Geographic breakdown
- Trend monitoring

## Quick Reference

```bash
# Cold start measurement
adb shell am force-stop com.example.myapp
adb shell pm clear com.example.myapp
sleep 2
adb logcat -c
adb shell am start-activity -W -n com.example.myapp/.MainActivity
adb logcat | grep "Displayed"

# Multiple iterations
for i in {1..10}; do
  adb shell am force-stop com.example.myapp
  adb shell pm clear com.example.myapp
  sleep 2
  adb logcat -c
  adb shell am start-activity -W -n com.example.myapp/.MainActivity
  adb logcat | grep "Displayed"
done

# Benchmark test
./gradlew :app:connectedAndroidTest
```

## Conclusion

Measuring Android app startup time is essential for delivering great user experiences. Key takeaways:

1. **Focus on cold start** - It's the worst-case scenario users experience
2. **Measure Time to Initial Display** - From launch to first visible frame
3. **Use logcat for quick checks** - Built-in and always available
4. **Use Benchmark library for precision** - Statistical analysis and automation
5. **Run multiple iterations** - Account for variability
6. **Clear app data between tests** - Ensure consistent measurements
7. **Test on real devices** - Emulators don't represent real performance
8. **Track relative improvements** - Percentage changes are more meaningful than absolute times
9. **Integrate with CI/CD** - Catch regressions before release
10. **Monitor in production** - Real user metrics reveal the truth

Remember: Every millisecond counts. Users notice the difference between 500ms and 1000ms startup times, even if they can't quantify it. Faster startups lead to happier users, better ratings, and increased retention.

## Further Reading

- [Android Developer Guide - App Startup Time](https://developer.android.com/topic/performance/vitals/launch-time)
- [androidx.benchmark Documentation](https://developer.android.com/studio/profile/benchmark)
- [Macrobenchmark Guide](https://developer.android.com/topic/performance/benchmarking/macrobenchmark-overview)
- [App Startup Library](https://developer.android.com/topic/libraries/app-startup)
