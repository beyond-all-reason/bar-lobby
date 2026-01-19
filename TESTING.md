<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: CC0-1.0
-->

# Testing (BAR Lobby)

This document describes how automated testing is set up in **bar-lobby**, and how to run tests locally and in CI.

- **Unit / integration tests:** Vitest
- **End-to-end (E2E) tests:** Playwright launching the Electron app

---

## Quick start

```bash
npm ci
npm run test
npm run test:e2e
```

---

## Unit tests (Vitest)

### What these tests are for

Use unit tests for:

- Pure functions and business logic
- Modules with well-defined boundaries (mock IO/network as needed)
- Renderer logic that can be exercised without a full Electron runtime

### Run unit tests

```bash
npm run test
```

Run a subset:

```bash
npx vitest run tests/some.test.ts
```

---

## E2E tests (Playwright + Electron)

### What these tests do

E2E tests launch the Electron app and interact with the real browser window(s) via Playwright. This exercises:

- Electron **main process** startup
- Window creation / BrowserWindow lifecycle
- Renderer load + DOM availability

E2E is a good place for:

- “App boots” / “critical views render” checks
- High-value workflows that cross main/renderer boundaries
- Regression coverage for production-only issues (packaging, preload wiring, navigation, etc.)

### Build artifacts are required

This repo’s `package.json` points Electron’s entrypoint at the Vite/Forge build output:

```json
"main": ".vite/build/main.cjs"
```

So E2E runs must have that output available. If invoked with `npm run test:e2e` this should happen automatically, otherwise run:

```ts
npm run package
```


### Running E2E locally

Install Playwright browsers (first time / after upgrading Playwright):

```bash
npx playwright install
```

Run E2E (after packaging):

```bash
npm run test:e2e
```

Debug mode:

```bash
PWDEBUG=1 npm run test:e2e
```

### ESM note (`__dirname`)

This repo is ESM (`"type": "module"`), so `__dirname` and `__filename` are not defined in tests.

To resolve paths relative to the current test file, use `import.meta.url`:

```ts
const __dirname = path.dirname(fileURLToPath(import.meta.url));
```

## Troubleshooting

### Electron launch failures

If Electron fails immediately, check:

- Is `.vite/build/main.cjs` present? If not, run `npm run package`.
- Are you hitting Linux sandbox errors? In CI, add `--no-sandbox` for Electron.
- Are you missing a display? On Linux, run via `xvfb-run -a`.

### `__dirname is not defined`

You’re running tests as ESM. Use `import.meta.url` + `fileURLToPath` (see above).

### “Cannot open display” / X server errors (Linux)

Run E2E with Xvfb:

```bash
xvfb-run -a npm run test:e2e
```

### Playwright browser dependencies (Linux)

If Playwright complains about missing system libraries, install with:

```bash
npx playwright install --with-deps
```

---

## Common commands

```bash
npm run test                 # Vitest
npm run package              # Electron Forge package (builds .vite/build/*)
npm run test:e2e             # Playwright E2E
PWDEBUG=1 npm run test:e2e   # debug E2E
xvfb-run -a npm run test:e2e # Linux headless display
npx playwright install       # install Playwright browsers
```
