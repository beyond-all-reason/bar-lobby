<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

# macOS Clean Machine Validation

This checklist validates that the macOS BAR.app path is reproducible on an Apple
Silicon Mac that does not have the original developer workspace.

The accepted runtime path is BAR.app through bar-lobby. Direct `spring` launches
are useful diagnostics, but they do not replace this app-path validation.

## Scope

This checklist validates:

- bar-lobby can package BAR.app from a fresh checkout.
- BAR.app can find a native macOS engine artifact and `pr-downloader`.
- BAR.app starts the lobby and launches the native engine through the runner.
- the child engine uses the bundled Mesa/Zink/Vulkan runtime instead of a
  developer machine runtime.
- no account, session, cache, replay, log, or user state is required from the
  original machine.

This checklist does not validate live multiplayer sync by itself. Treat
intermittent multiplayer sync as a separate engine/content/network open question.

## Inputs

Prepare these inputs outside the repo:

```text
bundled-assets-source/
  engine/
    <engineVersion>/
      spring
      pr-downloader
  runtime/
    mesa-zink/
    moltenvk-pr2746/
    sdl3/
    vulkan-loader/
    fontconfig/
  engine-fonts/
  fonts/
```

Optional content overlays, when testing a port-certified visual build, belong in:

```text
bundled-assets-source/
  macos-luaui-overlay/
    LuaUI/
```

Do not copy a developer `BAR-data` directory into this input. Game, map, rapid,
pool, browser, account, log, and cache state must be created or downloaded on the
test machine.

## Build From A Fresh Checkout

```sh
git clone https://github.com/beyond-all-reason/bar-lobby.git
cd bar-lobby
git fetch https://github.com/yeojuny/bar-lobby-apple-silicon.git codex/macos-bar-app-runtime-stack
git switch --detach FETCH_HEAD
npm ci
BAR_BUNDLED_ASSETS_PATH=/absolute/path/to/bundled-assets-source npm run buildall:mac
```

The expected app path is:

```text
dist/mac-arm64/BAR.app
```

## Static Bundle Checks

Check that the native engine artifacts are app-local:

```sh
test -x dist/mac-arm64/BAR.app/Contents/Resources/bundled-assets/engine/<engineVersion>/spring
test -x dist/mac-arm64/BAR.app/Contents/Resources/bundled-assets/engine/<engineVersion>/pr-downloader
```

Check that the app verifies on disk:

```sh
codesign --verify --deep --strict --verbose=2 dist/mac-arm64/BAR.app
```

Check that the engine can load from inside the app bundle:

```sh
cd dist/mac-arm64/BAR.app/Contents/Resources/bundled-assets/engine/<engineVersion>
./spring --version
```

The `spring --version` output must report the same `<engineVersion>` that the
lobby will request. Do not alias a different native engine as the requested
version.

## Runtime Launch

Start the app:

```sh
open -n dist/mac-arm64/BAR.app
```

From the lobby, launch a local game through the normal UI or the macOS Chobby/dev
path. A valid app-path smoke has these signals:

- the lobby opens from BAR.app.
- the engine process starts from `BAR.app/Contents/Resources/bundled-assets`.
- the lobby log mirrors the macOS native-engine environment probe.
- the engine log reaches ingame.
- the renderer is Mesa/Zink over the bundled Vulkan backend.
- there are no `libvulkan` load failures, `eglInitialize failed` errors, shader
  compile failures, or engine crashes.

The log paths are under the test user's BAR app data directory. They must not be
pre-seeded from another machine.

## Failure Ownership

Use these boundaries when a clean-machine smoke fails:

- BAR.app does not open: packaging, signing, quarantine, or Electron app issue.
- `spring` is missing or not executable: bundled-assets packaging issue.
- `spring --version` reports a different version: engine artifact identity issue.
- `libvulkan` or `eglInitialize` fails: runtime dylib, rpath, or Vulkan ICD issue.
- lobby downloads `engine_linux64` on macOS: content-source guard regression.
- game reaches ingame but visuals are missing only for GS-dependent effects:
  content NoGS parity issue.
- multiplayer sometimes desyncs: separate sync investigation, not a clean-machine
  packaging pass/fail by itself.
