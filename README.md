# BAR Lobby

BAR Lobby is a new WIP lobby for the RTS game [Beyond All Reason](https://www.beyondallreason.info/). It hopes to boldly go where no Spring client has gone before, providing a more streamlined experience, with good visuals and UX being high priority. The ultimate goal of BAR Lobby is to replace all other lobbies when it comes to playing BAR. If a significant amount of people don't wish to use it because of reasons such as functionality or speed, then this project is going very wrong.

![image](https://user-images.githubusercontent.com/1434248/223881325-bb8ac4f5-ed14-4ad8-ad33-970781cf3089.png)

## [Docs](https://beyond-all-reason.github.io/bar-lobby/)

## Functionality and Goals

-   Provide functionality for everything related to BAR. Campaigns, Missions, Multiplayer, Replays etc
-   Simple and intutive codebase, lots of documenation for contributing
-   Steam integration, automatic account creation and login
-   Smooth, seemless, fully integrated downloads. Content should be preloaded when sensible
-   Communicate entirely via Teiserver's new protocol, [Tachyon](https://github.com/beyond-all-reason/teiserver/tree/master/documents/tachyon). No support for the legacy SpringLobbyProtocol
-   TLS only, no unencypted comms

## Development

### Primary Tech Stack

-   [Electron](https://www.electronjs.org/)
-   [Vue 3](https://v3.vuejs.org/)
-   [TypeScript](https://www.typescriptlang.org/)
-   [SCSS](https://sass-lang.com/)
-   [PrimeVue Components](https://primevue.org/datatable)

### Recommended Environment

It is highly recommended to use [VSCode](https://code.visualstudio.com/) for development, as it provides full, built-in TypeScript support, as well as useful extensions such as [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) and [Vue - Official (previously Volar)](https://marketplace.visualstudio.com/items?itemName=vue.volar).

### Requirements

-   [Node.js 20](https://nodejs.org/en/download/)

### Local Development

```bash
npm install
npm run dev
```

### Project Structure

```
.
├──buildResources   # used by electron-builder
├──resources        # publicDir for main & preload
├──src
│  ├──main
│  │  ├──main.ts
│  │  └──...
│  ├──preload
│  │  ├──preload.ts
│  │  └──...
│  └──renderer      # with vue
│     ├──public     # (optional) publicDir for renderer
│     ├──index.ts
│     ├──index.html
│     └──...
├──electron-builder.config.ts
├──electron.vite.config.ts
├──package.json
└──...
```

- [**Main process**](https://www.electronjs.org/docs/latest/tutorial/process-model#the-main-process)
  - Runs in a Node.js environment and has access to Node.js APIs
  - Anything requiring access to the operating system or Node.js APIs needs to live here
- [**Preload script**](https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts)
  - Runs in a Node.js environment
  - Defines global objects that can be used in the renderer
  - Handles communication between the main and renderer processes
    - Uses Electron's ipcMain and ipcRenderer modules for inter-process communication (IPC).
- [**Renderer process**](https://www.electronjs.org/docs/latest/tutorial/process-model#the-renderer-process)
  - Runs in a web environment and has **no** direct access to Node.js APIs

### Build & Publish:

- [`electron-vite`](https://electron-vite.org/guide/introduction)
  - Builds the app with a pre-configured Vite setup for Electron apps
  - This intentionally does not include `electron` or any other `node_modules` dependencies in the build
    - Dependencies get added to the package by `electron-builder` with ASAR
    - Note: apps that only have CJS exports need to be included in the build, e.g. `glob-promise`
- [`electron-builder`](https://www.electron.build/)
  - Packages Electron app for distribution
    - Configured for Windows NSIS installer and Linux AppImage
  - Handles publishing updates
    - Auto-updates TBD

### Commands

- `npm run dev` or `npm start`
  - Runs `electron-vite` in `development` mode
  - **renderer** runs with Hot Module Replacement (HMR)
  - **main** and **preload** are directly bundled to `out`
    - Run as `npm run dev -- --watch` to [enable Hot Reloading](https://electron-vite.org/guide/hot-reloading#enable-hot-reloading) in **main** and **preload**
- `npm run preview`
  - Runs `electron-vite` in `production` mode, and runs electron
  - **main**, **preload**, and **renderer** are bundled to `out`
  - This is useful for validating the `production` build without packaging the app
- `npm run build`
  - Runs `electron-vite` in `production` mode
  - **main**, **preload**, and **renderer** are bundled to `out`
  - Also runs TypeScript typechecking
- `npm run build:win`
  - Runs `npm run build` and `electron-builder`, building for Windows
  - Outputs NSIS installer in `dist`
- `npm run build:linux`
  - Runs `npm run build` and `electron-builder`, building for Linux
  - Outputs AppImage executable in `dist`
- `npm run build:unpack`
  - Runs `npm run build` and `electron-builder`, building an unpackaged directory
  - Outputs the unpacked contents in `dist`
  - Useful for testing
- `npm run dev-cert` (optional and only for Windows development)
  - Runs `electron-builder` to create a self-signed cert for Windows apps.
  - After selecting "None" in the pop-up, a cert file should be created called `BAR Team.pfx`
  - Then run `npm run build:win:dev-cert` to build a signed Windows installer
