<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

# macOS BAR.app Smoke Launch

Thread 03 adds the minimal macOS packaging lane for Apple Silicon:

```sh
npm run buildall:mac
open dist/mac-arm64/BAR.app
```

The accepted launch path is `BAR.app`. This smoke only verifies that the lobby opens through the app bundle.

Native game launch still requires a real macOS engine artifact at one of these paths:

```text
~/Library/Application Support/BAR/assets/engine/<engineVersion>/spring
BAR.app/Contents/Resources/bundled-assets/engine/<engineVersion>/spring
```

The same artifact must contain `pr-downloader` beside `spring`. Do not use `engine_linux64` on macOS, and do not write downloaded engines, maps, games, packages, pool, or rapid data into `BAR.app`.

To include an immutable native engine smoke artifact in the app bundle, point `BAR_BUNDLED_ASSETS_PATH` at a directory shaped like this before running the macOS build:

```text
bundled-assets-source/
  engine/
    <engineVersion>/
      spring
      pr-downloader
```

Example:

```sh
BAR_BUNDLED_ASSETS_PATH=/path/to/bundled-assets-source npm run buildall:mac
```
