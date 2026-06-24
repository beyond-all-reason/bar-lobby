<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

# macOS Homebrew Runtime Packaging

The macOS port should stay lean enough for Homebrew and GitHub release delivery.

## Channels

- `bar-lobby` tracks the latest macOS port-certified runtime.
- Chobby multiplayer tracks the engine and game profile that the live BAR multiplayer ecosystem currently accepts.
- The Chobby profile is data, not a lobby source-code constant. Package it as `bundled-assets/chobby-multiplayer-profile.json`, refresh it from a small remote manifest when configured, and cache it in user config after a successful remote fetch.

## Artifact Contract

- Engine artifacts are selected by official engine id: `bundled-assets/engine/<engineVersion>/spring`.
- Do not alias a different native runtime as a multiplayer engine. If Chobby asks for `2025.06.24`, the runtime binary must report `spring version 2025.06.24`.
- Do not patch official Chobby multiplayer rapid pool files locally. Live multiplayer must keep official game content byte-identical; macOS rendering fixes must come from the engine/runtime stack or from upstream-compatible content releases.
- Chobby multiplayer engine launches keep `SPRING_DATADIR` limited to mutable official content plus the selected bundled engine path, so bundled LuaUI/LuaRules overlays cannot leak into live games.
- End-user machines should not build Recoil as part of normal install or Chobby launch.
- Homebrew/GitHub delivery should provide prebuilt native macOS engine artifacts keyed by engine version, plus the shared runtime stack.

## Platform Floor

- Avoid raising the deployment target only because the local compiler or SDK is new.
- If a newer macOS floor is required, it must be because the MoltenVK/Mesa/Zink/Recoil stack materially benefits from that OS/runtime combination.
- Keep older supported macOS artifacts possible when they do not compromise the selected graphics/runtime stack.

## Release Shape

- Keep user state out of public packages.
- Keep BAR game content and Chobby content downloaded through BAR rapid/CDN flows where possible.
- Keep formula logic small: install app/runtime artifacts, verify versions, and avoid per-user build steps.
