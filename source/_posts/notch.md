---
title: Android dialog on screen with notch
categories:
  - Android
tags:
  - android
  - screen notch
excerpt:
  - Fix top space on screens with notch
date: 2020-03-16 13:40:37
---

## Styles for full screen dialogs. Fix top space on screens with notch

### Add new style

```xml
    <style name="FullScreenDialog" parent="Theme.Design.Light.NoActionBar">
        <item name="android:statusBarColor">@android:color/transparent</item>
        <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>
        <item name="android:fitsSystemWindows">true</item>
    </style>
```

### Add code to dialog constructor

```java
if (Build.VERSION.SDK_INT >= 21) {
    Window window = getWindow();
    window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
    window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
    window.setStatusBarColor(getContext().getResources().getColor(R.color.dialog_bg_black));
}
```