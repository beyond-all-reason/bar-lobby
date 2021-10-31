# BAR Lobby

BAR Lobby is a new WIP lobby for the RTS game [Beyond All Reason](https://github.com/beyond-all-reason/Beyond-All-Reason). It hopes to boldly go where no Spring client has gone before, providing a more streamlined experience with good visuals and UX being high priority. The ultimate goal of BAR Lobby is to replace all other lobbies when it comes to playing BAR. If a significant amount of people don't wish to use it because of reasons such as functionality or speed, then this project is going very wrong.

## Functionality and Goals

- Provide functionality for everything related to BAR. Campaigns, Missions, Multiplayer, Replays etc
- Simple and intutive development, lots of documenation for contributing
- Steam integration, automatic account creation and login
- Smooth, seemless, fully integrated downloads. Content should be preloaded when sensible
- Communicate entirely via Teiserver's new protocol, [Tachyon](https://github.com/beyond-all-reason/teiserver/tree/master/documents/tachyon). No support for the legacy SpringLobbyProtocol
- TLS only, no unencypted comms

## Development
Contributing to BAR Lobby should be a stress-free and ideally _fun_ experience. The tech stack has been chosen with this in mind.

### Primary Tech Stack
- Electron
- TypeScript
- SCSS
- Vue
  - Vue Router
  - Vuex
  - @vueuse/sound (Howler)

### Recommended Environment
It is highly recommended to use VSCode for development, as it provides full, built-in TypeScript support, as well as useful extensions such as ESLint and Vetur.

### Requirements
- node.js (14.18.1 is as intended but other versions might work too)

### NPM Scripts
Project setup - `npm install`

Compile and hot-reload for development - `npm run electron:serve`

Compile and minify for production - `npm run electron:build`

Lint and fix files - `npm run lint`
