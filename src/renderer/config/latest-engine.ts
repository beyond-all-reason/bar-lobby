/**
 * This hardcoded version definition is only needed for singleplayer/offline games. Online battles simply fetch and use whichever version that autohosts are running.
 *
 * We need to define and change this manually, because the latest version of the engine may not be compatible with the latest version of the game,
 * or not intended for public use.
 *
 * In the future, this value should probably be set and fetched from the master server, so we don't need to deploy a new lobby release every time.
 *
 * It may also make sense to define latestStableGameVersion here, but for now, we assume that the latest game version is stable.
 */
export const latestStableEngineVersion = "105.1.1-1478-gbc6400c BAR105";
