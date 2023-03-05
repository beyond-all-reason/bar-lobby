/**
 * These hardcoded versions are only needed for singleplayer/offline games. Online battles simply fetch and use whichever version that autohosts are running.
 *
 * We need to define and change these manually because the latest engine and game version may be incompatible with each other, or could be untested and containing bugs.
 *
 * In the future these values should probably be set and fetched from the master server, so we don't need to deploy a new lobby release every time.
 */

export const defaultEngineVersion = "105.1.1-1544-g058c8ea BAR105";

export const defaultGameVersion = "Beyond All Reason test-22425-e6c0e37";
