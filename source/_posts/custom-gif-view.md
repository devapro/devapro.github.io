---
title: Play GIF
date: 2020-03-03 23:17:59
categories:
- Android
tags:
- android
- gif
excerpt:
- Custom view for playing GIF
---

## View for images or gif, support square mode

``` java

import android.annotation.SuppressLint;
import android.content.Context;
import android.content.res.TypedArray;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Matrix;
import android.graphics.Movie;
import android.graphics.Paint;
import android.graphics.RectF;
import android.os.Build;
import android.util.AttributeSet;
import android.view.View;

import androidx.appcompat.widget.AppCompatImageView;
import androidx.core.graphics.drawable.RoundedBitmapDrawable;
import androidx.core.graphics.drawable.RoundedBitmapDrawableFactory;

import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

public class CustomGifView extends AppCompatImageView {

    private int movieMovieResourceId = 0;
    private Movie movie = null;
    RoundedBitmapDrawable roundedBitmapDrawable = null;
    private Long movieStart = 0l;
    private int currentAnimationTime = 0;

    private Float movieLeft = 0F;
    private Float movieTop = 0F;
    private Float movieScale = 0F;

    private int movieMeasuredMovieWidth = 0;
    private int movieMeasuredMovieHeight = 0;
    private int cornersRadius = 0;

    private static int DEFAULT_MOVIE_VIEW_DURATION = 1000;

    volatile Boolean isPaused = false;
    private Boolean isVisible = true;
    private Boolean empty = true;
    private boolean isSquare = false;

    private Runnable setDataRunnable = null;

    public CustomGifView(@NotNull Context context) {
        this(context, null, 0);
    }

    public CustomGifView(@NotNull Context context, @Nullable AttributeSet attrs) {
        this(context, attrs, 0);
    }

    public CustomGifView(@NotNull Context context, @Nullable AttributeSet attrs, int defStyle) {
        super(context, attrs, defStyle);
        getViewTreeObserver().addOnGlobalLayoutListener(() -> {
            int maxHeight = getContext().getResources().getDimensionPixelSize(R.dimen.d_300dp);
            int minHeight = getContext().getResources().getDimensionPixelSize(R.dimen.d_72dp);

            if(movieMeasuredMovieWidth == 0) {
                movieMeasuredMovieWidth = getWidth();
            }
            if(movieMeasuredMovieHeight == 0) {
                movieMeasuredMovieHeight = getHeight();
            }

            movieMeasuredMovieHeight = Math.min(movieMeasuredMovieHeight, maxHeight);
            movieMeasuredMovieHeight = Math.max(movieMeasuredMovieHeight, minHeight);
            if(isSquare){
                movieMeasuredMovieHeight = movieMeasuredMovieWidth;
            }

            if(setDataRunnable !=null){
                post(setDataRunnable);
            }
        });
    }

    @SuppressLint("NewApi")
    private void setViewAttributes(Context context, AttributeSet attrs, int defStyle) {
        setLayerType(View.LAYER_TYPE_SOFTWARE, null);

        TypedArray array = context.obtainStyledAttributes(attrs,
            R.styleable.CustomGifView, defStyle, R.style.Widget_CustomGifView);

        //-1 is default value
        movieMovieResourceId = array.getResourceId(R.styleable.CustomGifView_gif, -1);
        isPaused = array.getBoolean(R.styleable.CustomGifView_paused, false);

        array.recycle();

        if (movieMovieResourceId != -1) {
            movie = Movie.decodeStream(getResources().openRawResource(movieMovieResourceId));
        }
    }


    public void play() {
        if (this.isPaused) {
            this.isPaused = false;
            /**
             * Calculate new movie start time, so that it resumes from the same
             * frame.
             */
            movieStart = android.os.SystemClock.uptimeMillis() - currentAnimationTime;
            invalidate();
        }
    }

    public void pause() {
        if (!this.isPaused) {
            this.isPaused = true;
            invalidate();
        }
    }

    public void setSquare(boolean square) {
        isSquare = square;
    }

    public void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
        int maxHeight = getContext().getResources().getDimensionPixelSize(R.dimen.d_300dp);
        int minHeight = getContext().getResources().getDimensionPixelSize(R.dimen.d_72dp);
        if (movie == null && roundedBitmapDrawable == null) {
            super.onMeasure(widthMeasureSpec, widthMeasureSpec);
        } else {
            int movieWidth = 0;
            int movieHeight = 0;
            if (movie != null) {
                movieWidth = movie.width();
                movieHeight = movie.height();
            }
            if(roundedBitmapDrawable != null) {
                movieWidth = roundedBitmapDrawable.getIntrinsicWidth();
                movieHeight = roundedBitmapDrawable.getIntrinsicHeight();
            }

            if(isSquare){
                movieHeight = movieWidth;
            }

            /*
             * Calculate horizontal scaling
             */
            float scaleH = 1f;
            int measureModeWidth = View.MeasureSpec.getMode(widthMeasureSpec);

            if (measureModeWidth != View.MeasureSpec.UNSPECIFIED) {
                int maximumWidth = View.MeasureSpec.getSize(widthMeasureSpec);
                scaleH = (float) movieWidth / (float) maximumWidth;
            }
            /*
             * calculate vertical scaling
             */
            float scaleW = 1f;
            int measureModeHeight = View.MeasureSpec.getMode(heightMeasureSpec);

            if (measureModeHeight != View.MeasureSpec.UNSPECIFIED) {
                int maximumHeight = View.MeasureSpec.getSize(heightMeasureSpec);
                scaleW = (float) movieHeight / (float) maximumHeight;
            }
            /*
             * calculate overall scale
             */
            if(isSquare && roundedBitmapDrawable.getIntrinsicHeight() <= roundedBitmapDrawable.getIntrinsicWidth()){
                movieScale = 1f / Math.max(scaleH, scaleW);
            }
            else {
                movieScale = 1f / Math.min(scaleH, scaleW);
            }
            movieMeasuredMovieWidth = (int)(movieWidth * movieScale);
            movieMeasuredMovieHeight = (int)(movieHeight * movieScale);

            movieMeasuredMovieHeight = Math.min(movieMeasuredMovieHeight, maxHeight);
            movieMeasuredMovieHeight = Math.max(movieMeasuredMovieHeight, minHeight);
            if(isSquare){
                movieMeasuredMovieHeight = movieMeasuredMovieWidth;
            }

            setMeasuredDimension(movieMeasuredMovieWidth, movieMeasuredMovieHeight);
        }
    }

    @Override
    protected void onLayout(boolean changed, int left, int top, int right, int bottom) {
        super.onLayout(changed, left, top, right, bottom);
        /*
         * Calculate movieLeft / movieTop for drawing in center
         */
        movieLeft = (getWidth() - movieMeasuredMovieWidth) / 2f;
        movieTop = (getHeight() - movieMeasuredMovieHeight) / 2f;
        isVisible = getVisibility() == View.VISIBLE;
    }

    @Override
    public void onDraw(Canvas canvas) {
        if(empty){
            canvas.drawColor(Color.TRANSPARENT);
        } else {
            if (movie != null) {
                if (!isPaused) {
                    updateAnimationTime();
                    drawMovieFrame(canvas);
                    invalidateView();
                } else {
                    drawMovieFrame(canvas);
                }
            }
            else if(roundedBitmapDrawable != null){
                roundedBitmapDrawable.setBounds(0, 0, movieMeasuredMovieWidth, movieMeasuredMovieHeight);
                roundedBitmapDrawable.draw(canvas);
            }
        }
    }

    /**
     * Draw current GIF frame
     */
    private void drawMovieFrame(Canvas canvas) {
        movie.setTime(currentAnimationTime);
        canvas.save();
        canvas.scale(movieScale, movieScale);
        movie.draw(canvas, movieLeft / movieScale, movieTop / movieScale);
        canvas.restore();

        if(cornersRadius > 0){
            Paint paint = new Paint();
            paint.setStyle(Paint.Style.STROKE);
            paint.setColor(Color.WHITE);
            paint.setAntiAlias(true);
            paint.setStrokeWidth(cornersRadius*2);

            canvas.drawRoundRect(
                new RectF(0-cornersRadius, 0-cornersRadius, movieMeasuredMovieWidth+cornersRadius, movieMeasuredMovieHeight+cornersRadius),
                2*cornersRadius,
                2*cornersRadius,
                paint);
        }
    }

    /**
     * Invalidates view only if it is isVisible.
     * <br></br>
     * [.postInvalidateOnAnimation] is used for Jelly Bean and higher.
     */
    @SuppressLint("NewApi")
    private void invalidateView() {
        if (isVisible) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
                postInvalidateOnAnimation();
            } else {
                invalidate();
            }
        }
    }

    /**
     * Calculate current animation time
     */
    private void updateAnimationTime() {
        long now = android.os.SystemClock.uptimeMillis();

        if (movieStart == 0L) {
            movieStart = now;
        }

        int duration = movie.duration();

        if (duration == 0) {
            duration = DEFAULT_MOVIE_VIEW_DURATION;
        }

        currentAnimationTime = (int)((now - movieStart) % duration);
    }

    @SuppressLint("NewApi")
    public void onScreenStateChanged(int screenState) {
        super.onScreenStateChanged(screenState);
        isVisible = screenState == View.SCREEN_STATE_ON;
        invalidateView();
    }

    @SuppressLint("NewApi")
    public void onVisibilityChanged(View changedView, int visibility) {
        super.onVisibilityChanged(changedView, visibility);
        isVisible = visibility == View.VISIBLE;
        invalidateView();
    }

    public void onWindowVisibilityChanged(int visibility) {
        super.onWindowVisibilityChanged(visibility);
        isVisible = visibility == View.VISIBLE;
        invalidateView();
    }

    public void setGif(byte[] data){
        if (setDataRunnable != null) {
            return;
        }
        empty = true;

        movie = Movie.decodeByteArray(data, 0, data.length);
        if(movie == null){
            int maxHeight = getContext().getResources().getDimensionPixelSize(R.dimen.d_300dp);
            int maxWidth = maxHeight * 2;
            final BitmapFactory.Options options = new BitmapFactory.Options();
            options.inJustDecodeBounds = true;
            BitmapFactory.decodeByteArray(data, 0, data.length, options);

            final BitmapFactory.Options options2 = new BitmapFactory.Options();
            options2.inSampleSize = calculateInSampleSize(options, maxWidth, maxHeight);
            Bitmap bitmap = BitmapFactory.decodeByteArray(data, 0, data.length, options2);

            roundedBitmapDrawable = RoundedBitmapDrawableFactory.create(getResources(), bitmap);
            roundedBitmapDrawable.setCornerRadius(cornersRadius);
        }

        movieMeasuredMovieHeight = 0;
        movieMeasuredMovieWidth = 0;
        setDataRunnable = this::resizeData;

        requestLayout();
    }

    private void resizeData(){
        setDataRunnable = null;
        if(movie == null && roundedBitmapDrawable != null && roundedBitmapDrawable.getBitmap() != null && movieMeasuredMovieWidth > 0 && movieMeasuredMovieHeight > 0){
            roundedBitmapDrawable = RoundedBitmapDrawableFactory.create(getResources(), scaleBitmap(roundedBitmapDrawable.getBitmap(), movieMeasuredMovieWidth, movieMeasuredMovieHeight));
            roundedBitmapDrawable.setCornerRadius(cornersRadius);
        }
        empty = false;
        invalidate();
    }

    public boolean isPlaying(){
        return !this.isPaused;
    }

    public void setCornersRadius(int cornersRadius) {
        this.cornersRadius = cornersRadius;
    }

    public void clear(){
        empty = true;
        movieMeasuredMovieHeight = 0;
        movieMeasuredMovieWidth = 0;
        requestLayout();
    }

    private int calculateInSampleSize(
        BitmapFactory.Options options,
        int reqWidth,
        int reqHeight
    ) {
        final int height = options.outHeight;
        final int width = options.outWidth;
        int inSampleSize = 1;

        if (height > reqHeight || width > reqWidth) {
            while ((height / inSampleSize) >= reqHeight
                && (width / inSampleSize) >= reqWidth) {
                inSampleSize *= 2;
            }
        }
        return inSampleSize;
    }

    private Bitmap scaleBitmap(Bitmap originalImage, int wantedWidth, int wantedHeight)
    {
        Bitmap output = Bitmap.createBitmap(wantedWidth, wantedHeight, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(output);
        Matrix m = new Matrix();

        float scaleW = (float)wantedWidth / originalImage.getWidth();
        float scaleH = (float)wantedHeight / originalImage.getHeight();

        float scale = Math.max(scaleW, scaleH);

        m.setScale(scale, scale);
        canvas.drawBitmap(originalImage, m, new Paint());
        return output;
    }
}

```

``` xml
    <declare-styleable name="CustomGifView">
        <attr name="gif" format="reference" />
        <attr name="paused" format="boolean" />
    </declare-styleable>
```
