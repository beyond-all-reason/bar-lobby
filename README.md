# BAR Lobby

BAR Lobby is a new WIP lobby for the RTS game [Beyond All Reason](https://www.beyondallreason.info/). It hopes to boldly go where no Spring client has gone before, providing a more streamlined experience, with good visuals and UX being high priority. The ultimate goal of BAR Lobby is to replace all other lobbies when it comes to playing BAR. If a significant amount of people don't wish to use it because of reasons such as functionality or speed, then this project is going very wrong.

## Functionality and Goals

- Provide functionality for everything related to BAR. Campaigns, Missions, Multiplayer, Replays etc
- Simple and intutive development, lots of documenation for contributing
- Steam integration, automatic account creation and login
- Smooth, seemless, fully integrated downloads. Content should be preloaded when sensible
- Communicate entirely via Teiserver's new protocol, [Tachyon](https://github.com/beyond-all-reason/teiserver/tree/master/documents/tachyon). No support for the legacy SpringLobbyProtocol
- TLS only, no unencypted comms
- Minimum supported resolution of 1440x900

## Development
Contributing to BAR Lobby should be a stress-free and ideally _fun_ experience. The tech stack has been chosen with this in mind.

### Primary Tech Stack
- [Tachyon Client](https://github.com/Jazcash/tachyon-client)
- [Electron](https://www.electronjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [SCSS](https://sass-lang.com/)
- [Vue 3](https://v3.vuejs.org/) with Composition API
  - [Vue CLI Plugin Electron Builder](https://nklayman.github.io/vue-cli-plugin-electron-builder/)
  - [Vue Router](https://next.router.vuejs.org/guide/)
  - [Vue Auto Routing](https://github.com/ktsn/vue-cli-plugin-auto-routing)
  - [Vuex](https://vuex.vuejs.org/)
  - [@vueuse/sound (Howler)](https://github.com/vueuse/sound)

### Recommended Environment
It is highly recommended to use [VSCode](https://code.visualstudio.com/) for development, as it provides full, built-in TypeScript support, as well as useful extensions such as [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) and [Vetur](https://marketplace.visualstudio.com/items?itemName=octref.vetur).

### Requirements
- [Node.js](https://nodejs.org/en/download/) (14.18.1 minimum but later versions probably work fine)

### NPM Scripts
Project setup - `npm install`

Compile and hot-reload for development - `npm run dev`

Compile and minify for production - `npm run build`

Lint and fix files - `npm run lint`
