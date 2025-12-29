---
title: Understanding Koin Scopes for Android Dependency Injection
lang: en
categories:
  - Android
  - Development
tags:
  - android
  - kotlin
  - koin
  - dependency-injection
  - architecture
date: 2025-12-29 18:00:00
excerpt:
  - Complete guide to using Koin scopes for managing dependencies with custom lifetimes in Android applications
---

Dependency injection is crucial for modern Android development, and Koin offers a lightweight solution. One of its most powerful but often misunderstood features is **scopes** - a way to manage dependencies with lifetimes shorter than your app's lifetime.

## The Problem: Sharing Objects with Custom Lifetimes

When building Android apps, we often need to share objects between components (Activities, Fragments, ViewModels) that have lifetimes between a singleton and factory:

- **Too broad**: Singletons live for the entire app lifetime, causing memory leaks if they hold references to Activities or Fragments
- **Too narrow**: Factories create new instances every time, preventing object sharing between components
- **Just right**: Scopes provide lifecycle-bound singletons that can be destroyed when no longer needed

Common scenarios:
- Sharing data between Fragments in the same Activity
- Passing state between screens in a flow (e.g., multi-step form, checkout process)
- Managing feature-specific dependencies that shouldn't be singletons

## Koin Scope Types

Koin provides three ways to create instances:

### 1. Single - App Lifetime Singleton

```kotlin
module {
    single { DatabaseHelper() }
}
```

- Created once when first requested
- Lives for the entire app lifetime
- Never destroyed until app is killed
- **Use for**: Database, API clients, app-wide managers

### 2. Factory - New Instance Every Time

```kotlin
module {
    factory { UserRepository() }
}
```

- Creates a new instance on every injection
- No caching or sharing
- **Use for**: Stateless objects, lightweight classes

### 3. Scoped - Destroyable Singleton

```kotlin
module {
    scope(named("checkoutScope")) {
        scoped { CheckoutState() }
        scoped { PaymentProcessor() }
    }
}
```

- Acts like a singleton within the scope lifetime
- Multiple components can share the same instance
- Manually created and destroyed
- **Use for**: Feature-specific dependencies, flow state management

**Key insight**: Scoped instances function as singletons with the ability to be destroyed.

## Basic Scope Usage

### Step 1: Define a Scope in Koin Module

```kotlin
val checkoutModule = module {
    scope(named("checkoutScope")) {
        scoped { CheckoutState() }
        scoped { ShippingCalculator() }
        scoped { PaymentProcessor(get()) } // Can inject other dependencies
    }
}
```

**Important details:**
- `named("checkoutScope")` creates a scope qualifier
- Multiple scoped dependencies can be defined in the same scope
- Dependencies can be injected using `get()` as usual

### Step 2: Create the Scope

In your Activity or Fragment:

```kotlin
class CheckoutActivity : AppCompatActivity() {
    private lateinit var scope: Scope

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Create and store scope reference
        scope = getKoin().createScope("uniqueScopeId", named("checkoutScope"))

        // Get scoped instance
        val checkoutState: CheckoutState = scope.get()
    }
}
```

**Key points:**
- First parameter: unique scope ID (can be any string)
- Second parameter: scope qualifier from module definition
- Store scope reference to close it later

### Step 3: Share Scope Between Components

```kotlin
class ShippingFragment : Fragment() {
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        // Retrieve existing scope by ID
        val scope = getKoin().getScope("uniqueScopeId")

        // Get the same CheckoutState instance as CheckoutActivity
        val checkoutState: CheckoutState = scope.get()
    }
}
```

Both components now share the same `CheckoutState` instance!

### Step 4: Close the Scope

**Critical**: Always close scopes to prevent memory leaks:

```kotlin
class CheckoutActivity : AppCompatActivity() {
    override fun onDestroy() {
        super.onDestroy()
        scope.close() // Destroys all scoped instances
    }
}
```

**Without closing**: Scoped instances behave like singletons and never get garbage collected.

## Advanced: Lifecycle-Aware Extension Functions

Manual scope management is error-prone. Create extension functions that automatically handle scope lifecycle:

### Fragment Scope Extensions

```kotlin
/**
 * Creates or retrieves a scope tied to this Fragment's lifecycle
 */
fun Fragment.getOrCreateScope(
    scopeId: String? = null,
    scopeName: Qualifier
): Scope {
    val id = scopeId ?: this::class.java.name

    return try {
        getKoin().getScope(id)
    } catch (e: Exception) {
        val newScope = getKoin().createScope(id, scopeName)

        // Automatically close scope when Fragment is destroyed
        lifecycle.addObserver(object : DefaultLifecycleObserver {
            override fun onDestroy(owner: LifecycleOwner) {
                newScope.close()
            }
        })

        newScope
    }
}

/**
 * Links this Fragment's scope to a parent scope for dependency resolution
 */
fun Fragment.linkScopeToActivity() {
    val activityScope = (requireActivity() as? MainActivity)?.scope
    activityScope?.let { parentScope ->
        getOrCreateScope(scopeName = named("fragmentScope")).apply {
            linkTo(parentScope)
        }
    }
}
```

### Activity Scope Extensions

```kotlin
/**
 * Creates or retrieves a scope tied to this Activity's lifecycle
 */
fun AppCompatActivity.getOrCreateScope(
    scopeId: String? = null,
    scopeName: Qualifier
): Scope {
    val id = scopeId ?: this::class.java.name

    return try {
        getKoin().getScope(id)
    } catch (e: Exception) {
        val newScope = getKoin().createScope(id, scopeName)

        // Automatically close scope when Activity is destroyed
        lifecycle.addObserver(object : DefaultLifecycleObserver {
            override fun onDestroy(owner: LifecycleOwner) {
                newScope.close()
            }
        })

        newScope
    }
}
```

### Usage with Extensions

Now scope management becomes much cleaner:

```kotlin
class CheckoutActivity : AppCompatActivity() {
    val scope: Scope by lazy {
        getOrCreateScope(scopeName = named("checkoutScope"))
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Scope is automatically created and will be closed on destroy
        val checkoutState: CheckoutState = scope.get()
    }
}

class ShippingFragment : Fragment() {
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        // Link to Activity's scope to access Activity-scoped dependencies
        linkScopeToActivity()

        val fragmentScope = getOrCreateScope(scopeName = named("fragmentScope"))
        val sharedState: CheckoutState = fragmentScope.get()
    }
}
```

## Scope Linking

Link scopes to create dependency hierarchies:

```kotlin
val appModule = module {
    scope(named("activityScope")) {
        scoped { ActivityDependency() }
    }

    scope(named("fragmentScope")) {
        scoped { FragmentDependency(get()) } // Can access parent scope
    }
}

// In code:
val activityScope = getKoin().createScope("activity1", named("activityScope"))
val fragmentScope = getKoin().createScope("fragment1", named("fragmentScope"))

// Link fragment scope to activity scope
fragmentScope.linkTo(activityScope)

// Now fragmentScope can access dependencies from activityScope
```

**Benefits:**
- Fragment can access Activity-scoped dependencies
- Maintains proper lifecycle boundaries
- Enables parent-child dependency relationships

## Practical Example: Multi-Step Checkout Flow

```kotlin
// Define modules
val checkoutModule = module {
    scope(named("checkoutScope")) {
        scoped { CheckoutState() }
        scoped { CartManager() }
        scoped { PaymentProcessor() }
    }
}

// Scope definition
data class CheckoutState(
    var shippingAddress: Address? = null,
    var paymentMethod: PaymentMethod? = null,
    var items: List<CartItem> = emptyList()
)

// Activity manages scope
class CheckoutActivity : AppCompatActivity() {
    val scope: Scope by lazy {
        getOrCreateScope(scopeName = named("checkoutScope"))
    }

    private val checkoutState: CheckoutState by lazy { scope.get() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_checkout)

        // Navigate through checkout steps
        showFragment(ShippingFragment())
    }

    // Scope automatically closed on destroy via lifecycle observer
}

// Fragment 1: Shipping
class ShippingFragment : Fragment() {
    private val checkoutState: CheckoutState by lazy {
        (requireActivity() as CheckoutActivity).scope.get()
    }

    fun onShippingConfirmed(address: Address) {
        checkoutState.shippingAddress = address
        // Navigate to payment
    }
}

// Fragment 2: Payment
class PaymentFragment : Fragment() {
    private val checkoutState: CheckoutState by lazy {
        (requireActivity() as CheckoutActivity).scope.get()
    }

    private val paymentProcessor: PaymentProcessor by lazy {
        (requireActivity() as CheckoutActivity).scope.get()
    }

    fun onPaymentConfirmed(method: PaymentMethod) {
        checkoutState.paymentMethod = method

        // Process payment with access to all checkout data
        paymentProcessor.process(checkoutState)
    }
}
```

**Benefits of this approach:**
- All fragments share the same `CheckoutState` instance
- State persists across fragment transactions
- Everything is cleaned up when Activity is destroyed
- No manual scope management needed with extension functions

## Common Pitfalls

### 1. Forgetting to Close Scopes

```kotlin
// ❌ BAD: Memory leak
class MyActivity : AppCompatActivity() {
    val scope = getKoin().createScope("myScope", named("activityScope"))

    // Forgot to close scope!
}

// ✅ GOOD: Use lifecycle observer
class MyActivity : AppCompatActivity() {
    val scope: Scope by lazy {
        getOrCreateScope(scopeName = named("activityScope"))
    }
    // Automatically closed via extension function
}
```

### 2. Creating Multiple Scopes with Same ID

```kotlin
// ❌ BAD: Will throw exception
val scope1 = getKoin().createScope("checkout", named("checkoutScope"))
val scope2 = getKoin().createScope("checkout", named("checkoutScope")) // Crash!

// ✅ GOOD: Use unique IDs or check existence
val scope = try {
    getKoin().getScope("checkout")
} catch (e: Exception) {
    getKoin().createScope("checkout", named("checkoutScope"))
}
```

### 3. Accessing Scope After Closing

```kotlin
// ❌ BAD: Will throw exception
scope.close()
val instance = scope.get<MyDependency>() // Crash!

// ✅ GOOD: Don't access closed scopes
scope.close()
// Don't use scope after this point
```

## When to Use Scopes

**Use scopes when:**
- ✅ You need to share state between multiple components
- ✅ Components have the same or nested lifetimes
- ✅ You want automatic cleanup when flow completes
- ✅ Dependencies shouldn't be app-wide singletons

**Don't use scopes when:**
- ❌ Dependency is truly app-wide (use `single` instead)
- ❌ No sharing needed (use `factory` instead)
- ❌ Managing lifecycle is too complex (consider other patterns)

## Conclusion

Koin scopes provide a powerful mechanism for managing dependencies with custom lifetimes. Key takeaways:

1. **Scopes = destroyable singletons** - Share instances within a lifecycle boundary
2. **Manual management required** - Must create and close scopes explicitly
3. **Lifecycle observers help** - Use extension functions for automatic cleanup
4. **Scope linking enables hierarchies** - Parent scopes can provide dependencies to children
5. **Always close scopes** - Prevent memory leaks by closing scopes when done

Scopes bridge the gap between singletons (too broad) and factories (too narrow), giving you precise control over dependency lifetimes in your Android applications.

## Further Reading

- [Koin Official Documentation - Scopes](https://insert-koin.io/docs/reference/koin-core/scopes)
- [Koin GitHub Repository](https://github.com/InsertKoinIO/koin)
- [Dependency Injection Best Practices](https://developer.android.com/training/dependency-injection)
