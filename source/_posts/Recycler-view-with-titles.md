---
title: Recycler view with titles
categories:
  - Android
tags:
  - custom view
  - android
  - recycler view
excerpt:
  - Creating ItemDecorator for titles in list
date: 2020-05-11 17:38:31
---

## Preparing

For showing how to use custom implementation ItemDecoration we need to create some common classes

### Create recycler view as custom view

``` java
public class PackagesListView extends RecyclerView {

    private final CustomAdapter adapter;

    public PackagesListView(@NonNull Context context) {
        this(context, null, 0);
    }

    public PackagesListView(@NonNull Context context, @Nullable AttributeSet attrs) {
        this(context, attrs, 0);
    }

    public PackagesListView(@NonNull Context context, @Nullable AttributeSet attrs, int defStyle) {
        super(context, attrs, defStyle);
        setItemAnimator(null);
        setLayoutManager(new LinearLayoutManager(context));
        adapter = new CustomAdapter();
        setAdapter(adapter);
        addItemDecoration(new TitleItemDecoration(context));
    }

    public void setItems(List<DataEntity> list) {
        adapter.setItems(packageItemList);
    }

    public static class PackageItem{
        private final DataEntityTrack track;
        private final DataEntityPackageOld entityPackage;
        private boolean lastInPackage;

        public PackageItem(DataEntityTrack track, DataEntityPackageOld entityPackage) {
            this.track = track;
            this.entityPackage = entityPackage;
        }

        public DataEntityTrack getTrack() {
            return track;
        }

        public DataEntityPackageOld getEntityPackage() {
            return entityPackage;
        }

        public boolean isLastInPackage() {
            return lastInPackage;
        }

        public void setLastInPackage(boolean lastInPackage) {
            this.lastInPackage = lastInPackage;
        }
    }
}

```

### Adapter

``` java
public class CustomAdapter extends AdapterRecycler<PackageItem>{

    private ActionListener listener;

    @Override
    protected RecyclerHolder createHolder(ViewGroup parent, int viewType) {
        return new Holder(inflate(parent.getContext(), Holder.LAYOUT, parent), new ActionListener() {
            @Override
            public void onItemClick(DataEntity item) {
                if(listener != null){
                    listener.onItemClick(item);
                }
            }

            @Override
            public void onPlay(DataEntity item) {
                if(listener != null){
                    listener.onPlay(item);
                }
            }
        });
    }

    @Override
    protected void bindHolder(RecyclerHolder holder, int position) {
        PackageItem nextItem = null;
        if(position + 1 < getItemCount()){
            nextItem = getItems().get(position + 1);
        }

        PackageItem currentItem = getItems().get(position);

        if(nextItem != null && nextItem.entityPackage.getId() != currentItem.entityPackage.getId()){
            currentItem.setLastInPackage(true);
        } else {
            currentItem.setLastInPackage(false);
        }
        holder.init(currentItem);
    }

    public void setListener(ActionListener listener) {
        this.listener = listener;
    }
}
```

### Holder

``` java
class Holder extends AdapterRecyclerBase.RecyclerHolder<PackageItem> {

  static final int LAYOUT = R.layout.item_list_songs;

  private final ImageView songImage;
  private final TextView tvTitle;
  private final TextView tvArtist;
  private final ImageView playStop;
  private final ActionListener listener;
  private final Button connect;

  public Holder(@NonNull View view, ActionListener listener) {
      super(view);
      this.listener = listener;
      songImage = view.findViewById(R.id.songImage);
      tvTitle = view.findViewById(R.id.songName);
      tvArtist = view.findViewById(R.id.songArtist);
      playStop = view.findViewById(R.id.songPlayStop);
      separatorBottom = view.findViewById(R.id.separator);
      connect = view.findViewById(R.id.connect);
  }

  @Override
  public void init(PackageItem item) {
      tvTitle.setText(item.getTrack().getName());
      tvArtist.setText(item.getTrack().getArtist().getName());
 
      view.setOnClickListener(v -> {
          listener.onItemClick(item.getTrack());
      });
      playStop.setOnClickListener( v -> {
          listener.onPlay(item.getTrack());
      });

      if(item.isLastInPackage()){
          connect.setVisibility(VISIBLE);
          connect.setOnClickListener(v -> {
              listener.onConnect(item.entityPackage);
          });
      } else {
          connect.setVisibility(GONE);
          connect.setOnClickListener(null);
      }
  }
}
```
### Item decorator

``` java
class TitleItemDecoration extends RecyclerView.ItemDecoration {

  private Paint fontPaint;
  private float topItemOffset = 0;
  private float topItemOffsetFirstItem = 0;
  private float bottomTextOffset = 0;
  private float xTextOffset = 0;

  public TitleItemDecoration(Context context) {
      fontPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
      fontPaint.setTextSize(context.getResources().getDimension(R.dimen.text_size_22));
      fontPaint.setStyle(Paint.Style.STROKE);
      fontPaint.setTypeface(ResourcesCompat.getFont(context, R.font.medium));
      bottomTextOffset = context.getResources().getDimension(R.dimen.item_spacing_2x);
      xTextOffset = context.getResources().getDimension(R.dimen.item_spacing_1x);
      topItemOffset = bottomTextOffset + context.getResources().getDimension(R.dimen.text_size_22) + context.getResources().getDimension(R.dimen.item_spacing_4x);
  }

  @Override
  public void onDrawOver(@NonNull Canvas canvas, @NonNull RecyclerView parent, @NonNull State state) {
      super.onDrawOver(canvas, parent, state);

      final int childCount = parent.getChildCount();
      CustomAdapter adapter = ((CustomAdapter) parent.getAdapter());

      if (childCount <= 0 || adapter == null || adapter.getItems().size() == 0) {
          return;
      }

      for (int i = 0; i < childCount; i++) {
          View child = parent.getChildAt(i);

          int position = parent.getChildAdapterPosition(child);
          PackageItem currentItem = null;

          if (((CustomAdapter) parent.getAdapter()).getItems().size() > position) {
              currentItem = ((CustomAdapter) parent.getAdapter()).getItems().get(position);
          }

          if (currentItem == null) {
              return;
          }

          if(hasTitle(child, parent)){
              canvas.drawText(currentItem.entityPackage.getName(), child.getX() + xTextOffset, child.getY() - bottomTextOffset, fontPaint);
          }

      }
  }

  @Override
  public void getItemOffsets(@NonNull Rect outRect, @NonNull View view, @NonNull RecyclerView parent, @NonNull State state) {
      super.getItemOffsets(outRect, view, parent, state);
      outRect.top = hasTitle(view, parent) ? (int) topItemOffset : 0;
  }

  private boolean hasTitle(@NonNull View child, @NonNull RecyclerView parent){
      final int childCount = parent.getChildCount();
      CustomAdapter adapter = ((CustomAdapter) parent.getAdapter());
      if (childCount <= 0 || adapter == null || adapter.getItems().size() == 0) {
          return false;
      }
      int position = parent.getChildAdapterPosition(child);

      PackageItem prevItem = null;
      if (position - 1 != NO_POSITION) {
          prevItem = ((CustomAdapter) parent.getAdapter()).getItems().get(position - 1);
      }
      PackageItem currentItem = null;

      if (((CustomAdapter) parent.getAdapter()).getItems().size() > position) {
          currentItem = ((CustomAdapter) parent.getAdapter()).getItems().get(position);
      }

      if (currentItem == null) {
          return false;
      }
      return prevItem == null || prevItem.entityPackage.getId() != currentItem.entityPackage.getId();
  }
}
```