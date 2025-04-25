---
title: Image (Bitmap) resizing and compress - Android
categories:
  - Android
tags:
  - Android
  - Bitmap
  - Image
excerpt:
  - Methods for working with bitmap without libraries
date: 2020-03-10 16:22:26
---

## Resizing and compress image file

Methods bellow show how compress image file without any libs.

### Main function
Set source file and max size for image

```java

public static File resize(File srcImage, int maxSize){
  final BitmapFactory.Options options = new BitmapFactory.Options();
  options.inJustDecodeBounds = true;
  BitmapFactory.decodeFile(srcImage.getPath(), options);

  final BitmapFactory.Options options2 = new BitmapFactory.Options();
  options2.inSampleSize = calculateInSampleSize(options, maxSize, maxSize); // see implementation below

  Bitmap bitmap = BitmapFactory.decodeFile(srcImage.getPath(), options2);

  if (bitmap == null) {
      return srcImage;
  }

  int orientation = getExifOrientation(srcImage.getPath()); // see implementation below
  bitmap = rotateBitmap(bitmap, orientation); // see implementation below

  String imageDirectory = "...../";
  String dstFileName = "my_file.png";
  File dstImage = new File(imageDirectory, dstFileName);

  try (FileOutputStream outputStream = new FileOutputStream(dstImage)) {
      bitmap.compress(Bitmap.CompressFormat.PNG, 90, outputStream);
  } catch (Exception ex) {
      ex.printStackTrace();
  }
  return dstImage;
}

```

### Calculate InSampleSize
If set to a value > 1, requests the decoder to subsample the original image, returning a smaller image to save memory. The sample size is the number of pixels in either dimension that correspond to a single pixel in the decoded bitmap. For example, inSampleSize == 4 returns an image that is 1/4 the width/height of the original, and 1/16 the number of pixels. Any value <= 1 is treated the same as 1. Note: the decoder uses a final value based on powers of 2, any other value will be rounded down to the nearest power of 2.

```java
public static int calculateInSampleSize(BitmapFactory.Options options, int reqWidth, int reqHeight) {
  final int height = options.outHeight;
  final int width = options.outWidth;
  return calculateInSampleSize(height, width, reqWidth, reqHeight);
}

public static int calculateInSampleSize(int height, int width, int reqWidth, int reqHeight) {
  int inSampleSize = 1;

  if (height > reqHeight || width > reqWidth) {
      while ((height / inSampleSize) >= reqHeight
          && (width / inSampleSize) >= reqWidth) {
          inSampleSize *= 2;
      }
  }
  return inSampleSize;
}
```

Sometimes image cloud contains exif meta information. Need rotate image before resize.

```java
public static int getExifOrientation(String imagePath) {
  int orientation = ExifInterface.ORIENTATION_NORMAL;
  try {
      ExifInterface exif = new ExifInterface(imagePath);
      String orientString = exif.getAttribute(ExifInterface.TAG_ORIENTATION);
      orientation = orientString != null ? Integer.parseInt(orientString) : ExifInterface.ORIENTATION_NORMAL;
  } catch (IOException e) {
      e.printStackTrace();
  }
  return orientation;
}

public static Bitmap rotateBitmap(Bitmap bitmap, int orientation) {
  Matrix matrix = new Matrix();
  switch (orientation) {
      case ExifInterface.ORIENTATION_NORMAL:
          return bitmap;
      case ExifInterface.ORIENTATION_FLIP_HORIZONTAL:
          matrix.setScale(-1, 1);
          break;
      case ExifInterface.ORIENTATION_ROTATE_180:
          matrix.setRotate(180);
          break;
      case ExifInterface.ORIENTATION_FLIP_VERTICAL:
          matrix.setRotate(180);
          matrix.postScale(-1, 1);
          break;
      case ExifInterface.ORIENTATION_TRANSPOSE:
          matrix.setRotate(90);
          matrix.postScale(-1, 1);
          break;
      case ExifInterface.ORIENTATION_ROTATE_90:
          matrix.setRotate(90);
          break;
      case ExifInterface.ORIENTATION_TRANSVERSE:
          matrix.setRotate(-90);
          matrix.postScale(-1, 1);
          break;
      case ExifInterface.ORIENTATION_ROTATE_270:
          matrix.setRotate(-90);
          break;
      default:
          return bitmap;
  }
  try {
      Bitmap bmRotated = Bitmap.createBitmap(bitmap, 0, 0, bitmap.getWidth(), bitmap.getHeight(), matrix, true);
      bitmap.recycle();

      return bmRotated;
  } catch (OutOfMemoryError e) {
      e.printStackTrace();
      return null;
  }
}
```