---
title: Download images (and GIF) with Glide
date: 2020-03-03 23:18:48
categories: 
- Android
tags: 
- android
- glide
- gif
excerpt:
- Download image and GIF file. Set into ImageView. Store as File.
---

## Download image as file
If you download File, methods like .override(int, int), .centerCrop() don't work. You always will get File object which stored in cache.

If you need configure cache folder or size, try this:
<https://github.com/bumptech/glide/wiki/Configuration#disk-cache>

### CustomTarget
``` java
Glide.with(context)
    .downloadOnly()
    .load(imgUrl)
    .into(new CustomTarget<File>(100,100) {

        @Override
        public void onResourceReady(@NonNull File resource, @Nullable Transition<? super File> transition) {
        }

        @Override
        public void onLoadCleared(@Nullable Drawable placeholder) {

        }
    });
```

### FutureTarget
``` java
FutureTarget<File> futureTarget = Glide.with(this)
        .asFile()
        .load(imgUrl)
        .priority(Priority.HIGH)
        .submit();

try {
    File res = futureTarget.get();
} catch (ExecutionException e) {
    e.printStackTrace();
} catch (InterruptedException e) {
    e.printStackTrace();
}
```

### With listener
``` java
Glide.with(this)
    .asFile()
    .listener(new RequestListener<File>() {
        @Override
        public boolean onLoadFailed(@Nullable GlideException e, Object model, Target<File> target, boolean isFirstResource) {
            return false;
        }

        @Override
        public boolean onResourceReady(File resource, Object model, Target<File> target, DataSource dataSource, boolean isFirstResource) {
            //success downloaded
            return false;
        }
    })
    .load(imgUrl)
    .submit();
```

## Loading GIF
### Loading into ImageView

``` java
Glide.with(this)
        .asGif()
        .override(500, 500)
        // use listener if you need
        .listener(new RequestListener<GifDrawable>() {
            @Override
            public boolean onLoadFailed(@Nullable GlideException e, Object model, Target<GifDrawable> target, boolean isFirstResource) {
                return false;
            }

            @Override
            public boolean onResourceReady(GifDrawable resource, Object model, Target<GifDrawable> target, DataSource dataSource, boolean isFirstResource) {
                // you can use resource independently
                return false;
            }
        })
        .load(gifUrl)
        .into(imgView);
```

### Loading as GifDrawable
If you load as GifDrawable and set into ImageView independently, remember call animatable.start() to start GIF animation
``` java
// d is GifDrawable object
 if (d instanceof Animatable) {
    Animatable animatable = (Animatable) d;
    animatable.start();
}
```

``` java
// imageView - any ImageView

FutureTarget<GifDrawable> drawableFutureTarget = Glide.with(MainActivity.this)
        .asGif()
        .override(500, 500)
        .centerCrop()
        .load(gifUrl)
        .submit();

try {
    final GifDrawable d = drawableFutureTarget.get();
    imageView.post(new Runnable() {
        @Override
        public void run() {
            imageView.setImageDrawable(d);
            if (d instanceof Animatable) {
                Animatable animatable = (Animatable) d;
                animatable.start();
            }
        }
    });
} catch (ExecutionException e) {
    e.printStackTrace();
} catch (InterruptedException e) {
    e.printStackTrace();
}
```

### Download with resizing
Load as Bitmap and store to file.

``` java
int maxSize = 500;

 FutureTarget<Bitmap> fileFutureTarget = Glide.with(context)
        .asBitmap()
        .load(url)
        .override(maxSize, maxSize)
        .centerCrop()
        .submit();


File dstImage = new File(context.getCacheDir(), new Date().getTime() + ".png");
try (FileOutputStream outputStream = new FileOutputStream(dstImage)) {
    Bitmap bitmap = fileFutureTarget.get();
    bitmap.compress(Bitmap.CompressFormat.PNG, 90, outputStream);
   // file successfully saved
} catch (Exception ex) {
    ex.printStackTrace();
}
```