---
title: "Let the Agent Own the Server: A Scriptable QA Proxy for AI-Driven App Development"
lang: en
categories:
  - AI
tags:
  - ai
  - agents
  - android
  - claude
  - skills
  - testing
  - developer-experience
date: 2026-10-07 19:50:00
translations:
  ru: ai-managed-server-states-qa-proxy-ru
excerpt:
  - An agent can write a mobile screen in minutes but can't put the backend into the state that screen needs. A scriptable QA proxy turns server responses into small files the agent writes, tests and verifies on its own.
---

An AI agent can now write a paywall screen, a billing banner or an error state in a few minutes. Checking that the screen works on a device is still slow. The screen depends on a server state: a subscription in a grace period, an exhausted quota, a 402 from an API, a halted instrument on a live socket. Sometimes the endpoint doesn't exist yet. The agent can't create any of that. A person has to find a test account, ask the backend team for a flag, or set up Charles by hand.

So the bottleneck in AI mobile development moves. Writing the client is cheap. Getting the server to answer the way the test needs is expensive. If the agent is going to test what it builds, it needs a way to **create and change server API responses itself**: quickly, as code, and with checks that tell it whether the change actually applied.

This post describes one way to do that: a small scriptable proxy between the app and the real backend. Each server state is a short JS file. Agents write those files, test them, switch them on per test case, and read a log that proves the rewrite happened. People review the result as a patch.

The proxy doesn't care which client sits in front of it: Android, iOS or desktop all work, as long as the app can send its HTTP and WebSocket traffic through a proxy and trust its CA. The integration shown here, and in the example repository, is Android only.

All the code is in the example repository, [devapro/qa-ai-proxy](https://github.com/devapro/qa-ai-proxy), laid out the way it would sit in a real Android project. The proxy runs on its own: `cd qa-proxy && npm ci && npm test`.

## Before the server is ready

A familiar situation: the API contract is agreed, but the backend isn't ready. To keep going, we hardcoded responses in the app (and later hunted them down to remove them), or asked the backend team for a temporary stub on the server. Both are slow, and both test something other than the real code path.

With an agent, the missing part can be generated. The agent reads the contract and writes a scenario that answers the new endpoint directly from the proxy. When the contract changes, it changes the scenario. The app code stays the same as it will be in production: the real client, real parsing, real error handling. Only the answer comes from the proxy.

The same mechanism covers the cases that are hard to get even from a finished server: a 500 in the middle of a flow, a 402 that should open the paywall, a 409 on a retry, an empty list, a field the app has never seen. Each is a param on a scenario, not a real data set or a bug planted on the server. When the backend ships, the scenario is deleted or turned into a rewrite of the real response.

## What actually needs testing against the real server

A full end-to-end test (app, real backend, real data) is needed less often than it seems. It matters when we integrate a third-party service, or when we want to check server-side behaviour or logs through the app. Most of the time we need an integration test: the server contract is known and the server works correctly; what's in question is whether **the app** handles every answer the contract allows.

That matches the usual advice. The test pyramid puts most tests below the UI, because UI and end-to-end tests are "brittle, expensive to write, and time consuming to run" ([Martin Fowler, Test Pyramid](https://martinfowler.com/bliki/TestPyramid.html)). Google's testing blog suggests roughly 70/20/10 for unit, integration and end-to-end tests, and warns that a suite built mostly on E2E tests gets slow and flaky ([Just Say No to More End-to-End Tests](https://testing.googleblog.com/2015/04/just-say-no-to-more-end-to-end-tests.html)). [The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html) recommends reducing end-to-end tests "to a bare minimum", stubbing external services, and avoiding automated tests against the real production system. The Android testing docs prefer fakes for remote data and hermetic tests with no external dependencies ([Use test doubles in Android](https://developer.android.com/training/testing/fundamentals/test-doubles)).

For these integration cases, changing the server's answer is much cheaper than creating dozens of real accounts on production. A QA server is the right alternative, and you should have one. But building a dedicated data set there (a subscription stuck in grace period, a user with exactly zero credits, a refunded purchase from another store) is still much harder than rewriting one response on the fly.

The approach only works if the contract the scenarios are built on is correct. That's what [contract tests](https://martinfowler.com/bliki/ContractTest.html) are for: they check periodically that test doubles still match the real service.

## Why the usual options don't fit an agent

| Option | Why it falls short |
|---|---|
| A test account in each state | States expire, accounts get shared and drift, and some states (a 500) can't be put on an account at all |
| A backend flag or a server-side stub | One ticket per state, and you test the stub rather than the real response |
| In-app mock or fake repository | Skips the real network path (TLS, interceptors, cache, parsing), and each state changes app code. Fine for instrumented tests, not for QA of the real app |
| Charles or mitmproxy by hand | One person, one laptop. Not scripted, not reviewed, not in CI |

Accounts and backend flags need people. Mocks need app changes. Charles needs someone clicking. An agent needs the real network path, the real backend where it exists, and a way to change only the response the test cares about, written as code it can create, test and throw away.

## The setup

```text
 Emulator / device
 ┌──────────────────────────────┐
 │ Debug app (OkHttp + WS) ─────┼──► qa-proxy :8080 ──► Real backend
 │                              │     (mockttp, Node)
 │ SDKs, WebViews ──────────────┼──► Real services (direct)
 └──────────────────────────────┘
                                       ▲
           scenarios/*.js ─────────────┤  one file = one server state
                                       │
 Test runner / AI agent ──► Control API :8090
                            (set scenarios, read the proof log)
```

Five rules hold it together:

1. **Rewrite the real answer when there is one.** A scenario changes only the fields the state needs; everything else stays real. When the endpoint doesn't exist yet, the scenario answers from the contract.
2. **Only the app's own traffic.** A debug-only `ProxySelector` routes the app's OkHttp clients through the proxy. SDKs, WebViews and the rest of the device go direct.
3. **Opt in per launch, fail open.** The app uses the proxy only after it's launched with an address. If the proxy is gone, the app connects directly.
4. **Proof, not hope.** Every rewrite is recorded in a traffic log. A test passes only if the log shows its scenario actually rewrote the request.
5. **Scenarios are code.** Small JS files with tests, reviewed in PRs. That's what makes it safe for an agent to write them.

The proxy itself is a Node 22 service of about 900 lines on [mockttp](https://github.com/httptoolkit/mockttp) (HTTP/TLS interception) and [ws](https://github.com/websockets/ws) (WebSocket relay). It loads and validates `scenarios/*.js`, runs their hooks on matching requests and socket frames, passes everything else through untouched, and keeps a ring-buffer log of what it changed. A control API on `:8090` (`PUT /active`, `GET /log?modified=true`, `POST /socket/emit`, `PUT /capture`) is what agents talk to: switching the server state is one HTTP call, checking that it applied is another. No restart, no redeploy, no person. The control API has no auth by design, so it stays on loopback or the compose network.

## Wiring the Android app

The app side is about 80 lines of Kotlin, all inert in release builds. The core is the selector:

```kotlin
override fun select(uri: URI?): List<Proxy> {
    val qaProxyAddress = qaProxySettings.proxyAddress()
        ?: return getDefault()?.select(uri) ?: listOf(Proxy.NO_PROXY)
    // DIRECT second: OkHttp falls back to the next route when the proxy refuses the connection
    return listOf(Proxy(Proxy.Type.HTTP, qaProxyAddress), Proxy.NO_PROXY)
}
```

OkHttp asks the selector for every new connection, so changing the address doesn't require rebuilding the client, and `DIRECT` as the second route makes the setup fail open. Install it on every client the app uses for its own backend, WebSocket included. `QaProxySettings` stores the address and returns `null` in non-debug builds.

The launcher activity reads a debug launch argument, and the address is persisted, so an agent can cold-start the app as often as it likes:

```bash
adb shell am start -W -n com.example.app/.LauncherActivity --es debug_qa_proxy 10.0.2.2:8080   # on
adb shell am start -W -n com.example.app/.LauncherActivity --es debug_qa_proxy none            # off
```

For TLS, the debug build has to trust the proxy CA. The recommended option is a `network_security_config.xml` in `src/debug` that trusts the proxy's CA certificate inside `<debug-overrides>`; user CAs or an existing trust-all debug client also work. Release builds must not change, and a unit test on the selector keeps that true.

**Other platforms** need the same three pieces: a debug-only way to route the app's own clients through the proxy, a switch per launch, and debug-only trust for the CA. On iOS that's a `URLSessionConfiguration` with `connectionProxyDictionary` plus a launch argument; on desktop, your HTTP client's proxy setting.

**System-level proxy.** The per-app selector is the default, not a requirement. `qa-proxy` is a standard HTTP(S) proxy, so it also works when configured for the whole system, which helps when you can't change the app's networking code:

- Android: `adb shell settings put global http_proxy 10.0.2.2:8080`, and `:0` to turn it off;
- iOS: Wi-Fi settings → HTTP Proxy → Manual on a device, the Mac's proxy settings for the simulator;
- desktop: the OS proxy settings, or `HTTPS_PROXY=http://127.0.0.1:8080`.

The client still has to trust the CA. On iOS that means installing the profile from `GET /ca.pem` and enabling full trust; Android 7+ apps ignore user CAs unless their network security config opts in. The price is that every SDK now goes through the proxy too (anything that doesn't trust the CA shows up as `tls-error`), and if the proxy stops, the whole device loses network until you clear the setting.

## Scenarios: one file, one server state

This is the "server API as code" part. A scenario is a plain JS module the agent reads, writes and tests like any other source file:

```js
// qa-proxy/scenarios/billing-grace-period.js (abridged)
export default {
    name: 'billing-grace-period',
    description: 'Puts the subscriber into a billing grace period … the banner also needs RC billingBannerEnabled = true.',
    params: { daysAgo: 3 },
    http: [{
        method: 'GET',
        path: '/users/v1/profile',
        onResponse(response, { params }) {
            const upstream = response.status < 300 && isObject(response.json) ? response.json : {};
            // The app reads a non-2xx profile as "subscription healthy", so the status is forced to 200.
            return {
                status: 200,
                json: {
                    ...upstream,
                    subscription_status: 'grace_period',
                    status_changed_at: new Date(Date.now() - Number(params.daysAgo) * DAY_MS).toISOString(),
                },
            };
        },
    }],
};
```

`onResponse` rewrites a real answer. `onRequest` can answer without contacting the server at all, which is how an endpoint that doesn't exist yet gets served from its contract. WebSocket scenarios can drop, modify or inject frames.

A few rules keep scenarios honest, whoever writes them:

- **Spread the upstream body and override only what the state needs.**
- **Match on `path`, not host**, because hosts differ between environments.
- **Every value a test varies is a param** with a default: `ai-credits:left=0:cost=5`.
- **The `description` says what else the app needs** (account, store, remote config). A scenario changes server data and nothing else.
- **No network calls, secrets or file I/O.**

Each scenario ships with hook unit tests and one end-to-end test through a real proxy, which checks both the rewritten body and that the log names the scenario. That log check paid off while preparing this post: it caught a race where answers sent from `onRequest` lost their "modified" mark, so a correctly arranged case was reported as BLOCKED. Check the proof log, not just the body.

## Test plans that name the mechanism

A plan that says "account in grace period" can't be executed without someone working out how. A plan that names the mechanism can be executed by anyone, including an agent:

```markdown
**Precondition:** Cold start. Signed in as the subscriber test account · QA proxy: `billing-grace-period:daysAgo=10:store=PLAY_STORE`
```

When a plan needs a state no scenario produces yet, it specifies it in a structured section: the state, the endpoint to rewrite, the params, what else the app needs, and which cases use it. That section is the API request the agent will fulfil. A deterministic checker, `check_proxy_specs.mjs`, uses the proxy's own parser and registry to check every spec in the plan against the scenarios that actually exist, and reports `MISSING_SCENARIO` (specified, can be written), `UNSPECIFIED_SCENARIO` (the plan author has to describe it), `UNREAD_PARAM` (a typo the proxy would silently ignore) and so on.

## Handing it to agents: the skill chain

Everything so far is deterministic tooling. The skills (Claude Code skills here, but the split works with any agent framework) add judgment where it's needed and keep it out of the places where it isn't.

```text
test-write-qa-cases   write plan with proxy specs; checker must pass
        │
        ▼
qa-device (runner)    checker → list of missing scenarios
        │
        ├──► qa-proxy-prepare (orchestrator)
        │        ├──► qa-proxy-scenario × N (workers, in parallel)
        │        │       trace the endpoint in app code, write scenario + tests
        │        └── re-verify itself: npm test + checker → RUNNABLE
        │
        └──► for each case:
                 reset app · PUT /active <spec> · clear log
                 device agent runs the steps → verdict
                 GET /log?modified=true → proof
             report + patch with new scenarios (uncommitted)
```

The choices worth copying, whatever framework you use:

- **Sub-agents keep the context small.** Tracing an endpoint through interfaces, models, mappers and caches means a lot of reading. That happens in a worker, and only a short fixed-format block comes back.
- **Verify, don't trust.** The orchestrator reruns the tests and the checker itself. A worker gets one retry; after that the files are reverted and the need is recorded as `unresolved` with a reason.
- **Plain code around the probabilistic parts.** Agents decide what to write; the parser, registry validation, checker and proof log decide whether it's valid and whether it applied.
- **A PASS without proof is BLOCKED.** If the log doesn't name the case's scenario, the test ran against real data and proves nothing.

In CI the same chain runs headless: a preparation step with no device writes the missing scenarios, the proxy starts with them (or discards them if they break startup), the QA run executes the plan, and the new scenarios are published as a patch. A developer reviews the patch, and only that review puts a scenario into the repo.

## Safety rails

Letting an agent control what the app sees from the server is only safe if a few things can't break. Each one is enforced by code, not by a prompt:

| Invariant | Enforced by |
|---|---|
| Release builds are unaffected | `isDebugBuild` checks, selector only on debug clients, unit tests |
| A dead proxy never takes the app offline | `[proxy, DIRECT]` route list |
| No false PASS | A case passes only if the log names its scenario |
| No state leaks between cases | Setting a list replaces the whole set; each case clears the log |
| A typo never runs against real data | An unknown scenario name rejects the whole list; the checker catches unread params |
| Generated code stays contained | Scenarios run only in the proxy container, with no secrets and no network calls, and nothing is committed without review |

## Pitfalls and limitations

- **The screen's condition reads more than one field.** The test account's subscription is from the App Store, the banner is Play-Store-only, and a spec that sets only the status leaves the gate closed. Name every field the condition reads.
- **The app never sends the request.** Repositories often skip a call for guests or users without a permission. No scenario can rewrite a request that's never made; the log shows it as missing.
- **Caches** can serve the old answer. The precondition must say how to force a fresh request.
- **The proxy changes what the app sees, not what the server believes.** A real write based on a faked state may be rejected by the server.
- **SDK and WebView traffic isn't rewritten**, by design. Check analytics in device logs.

## Why this matters for AI development

The client code is no longer the slow part. When an agent writes a feature, the slow part is proving it works against server states that are hard to reach, or against a server that doesn't exist yet. If changing what the server returns needs a ticket, a shared account or someone running Charles, the agent stops and waits for a person.

A scriptable proxy removes that wait. Server states become small files with tests. The agent writes them from the contract or the plan, the checker and the proof log tell it whether they're valid and whether they applied, and a person reviews the patch at the end. Only the response the test needs changes, and every change is code you can read.

The [example repository](https://github.com/devapro/qa-ai-proxy) maps every file in its README; [`docs/technical/QA-proxy.md`](https://github.com/devapro/qa-ai-proxy/blob/main/docs/technical/QA-proxy.md) is the full contract, and [`docs/qa-plans/sample-run-output/`](https://github.com/devapro/qa-ai-proxy/tree/main/docs/qa-plans/sample-run-output) shows a real preparation run.

If you're setting up a repository for agents in general, {% post_link anatomy-of-an-agent-ready-repo "Anatomy of an Agent-Ready Repo" %} covers the skills, rules and docs this setup builds on.
