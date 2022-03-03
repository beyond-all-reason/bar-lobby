// BAR-105.1.1-807-g98b14ce
export type EngineVersion = {
    branch: string;
    major: number;
    minor: number;
    patch: number;
    revision: number;
    sha: string;
};
export type EngineVersionFormat = `BAR-${number}.${number}.${number}-${number}-g${string}`;
export const EngineVersionFormatRegex = /^(?<branch>BAR)-(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)-(?<revision>\d+)-g(?<sha>[0-9a-f]+)$/i;
export function isEngineVersionString(version: string) : version is EngineVersionFormat {
    return EngineVersionFormatRegex.test(version);
}
export function parseEngineVersionString(engineVersionString: EngineVersionFormat) : EngineVersion {
    const { branch, major, minor, patch, revision, sha } = engineVersionString.match(EngineVersionFormatRegex)?.groups!;
    return { branch, major: Number(major), minor: Number(minor), patch: Number(patch), revision: Number(revision), sha };
}

// Beyond All Reason test-16289-b154c3d
export type GameVersion = {
    game: string;
    tag: string;
    revision: number;
    sha: string;
    fullString: string;
};
export type GameVersionFormat = `Beyond All Reason ${string}-${number}-${string}`;
export const GameVersionFormatRegex = /^(?<game>Beyond All Reason) (?<tag>\w+)-(?<revision>\d+)-(?<sha>\w+)$/i;
export function isGameVersionString(version: string) : version is GameVersionFormat {
    return GameVersionFormatRegex.test(version);
}
export function parseGameVersionString(gameVersionString: string) : GameVersion {
    const { game, tag, revision, sha } = gameVersionString.match(GameVersionFormatRegex)?.groups!;
    return { game, tag, revision: Number(revision), sha, fullString: gameVersionString };
}
