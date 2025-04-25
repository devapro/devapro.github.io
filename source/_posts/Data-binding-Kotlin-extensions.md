---
title: Data binding. Kotlin extensions.
categories:
- Android
tags:
- android
- data binding
- kotlin
excerpt:
- Extension function for initialization binding by lazy
date: 2020-05-11 17:28:27
---

## Data binding in Activity

``` kotlin
class ActivityBindingProperty<out T : ViewDataBinding>(
    @LayoutRes private val resId: Int
) : ReadOnlyProperty<AppCompatActivity, T> {

    private var binding: T? = null

    override operator fun getValue(
        thisRef: AppCompatActivity,
        property: KProperty<*>
    ): T = binding ?: createBinding(thisRef).also { binding = it }

    private fun createBinding(
        activity: AppCompatActivity
    ): T = DataBindingUtil.setContentView(activity, resId)
}
```

usage:

``` kotlin
private val binding by ActivityBindingProperty<HomeActivityBinding>(R.layout.home_activity)
```

## Data binding in fragment

``` kotlin
class FragmentDataBindingDelegate<T : ViewDataBinding>(
    val fragment: Fragment,
    @LayoutRes val resId: Int
) : ReadOnlyProperty<Fragment, T> {
    private var binding: T? = null

    init {
        fragment.lifecycle.addObserver(object : DefaultLifecycleObserver {
            override fun onStop(owner: LifecycleOwner) {
                binding = null
            }
        })
    }

    override fun getValue(thisRef: Fragment, property: KProperty<*>): T {
        val binding = binding
        if (binding != null) {
            return binding
        }

        val lifecycle = fragment.viewLifecycleOwner.lifecycle
        if (!lifecycle.currentState.isAtLeast(Lifecycle.State.INITIALIZED)) {
            throw IllegalStateException("Should not attempt to get bindings when Fragment views are destroyed.")
        }

        return createBinding(thisRef).also { it.lifecycleOwner = fragment }.also { this@FragmentDataBindingDelegate.binding = it }
    }

    private fun createBinding(
        fragment: Fragment
    ): T = DataBindingUtil.inflate(LayoutInflater.from(fragment.requireContext()),resId,null,true)
}

fun <T : ViewDataBinding> Fragment.dataBinding(@LayoutRes resId: Int) = FragmentDataBindingDelegate<T>(this, resId)
```

usage:

``` kotlin
private val mBinding by dataBinding(FragmentMedicineEditBinding::bind)
```

## Only view binding

``` kotlin
class FragmentViewBindingDelegate<T : ViewBinding>(
    val fragment: Fragment,
    val viewBindingFactory: (View) -> T
) : ReadOnlyProperty<Fragment, T> {
    private var binding: T? = null

    init {
        fragment.lifecycle.addObserver(object : DefaultLifecycleObserver {
            override fun onDestroy(owner: LifecycleOwner) {
                binding = null
            }
        })
    }

    override fun getValue(thisRef: Fragment, property: KProperty<*>): T {
        val binding = binding
        if (binding != null) {
            return binding
        }

        val lifecycle = fragment.viewLifecycleOwner.lifecycle
        if (!lifecycle.currentState.isAtLeast(Lifecycle.State.INITIALIZED)) {
            throw IllegalStateException("Should not attempt to get bindings when Fragment views are destroyed.")
        }

        return viewBindingFactory(thisRef.requireView()).also {
            this@FragmentViewBindingDelegate.binding = it
        }
    }
}

fun <T : ViewBinding> Fragment.viewBinding(viewBindingFactory: (View) -> T) = FragmentViewBindingDelegate(this, viewBindingFactory)
```

usage:

``` kotlin
 private val mBinding by viewBinding(FragmentMedicineEditBinding::bind)
```