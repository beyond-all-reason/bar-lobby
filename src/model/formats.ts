export type EngineVersion = {
    major: number;
    minor: number;
    patch: number;
    revision: number;
    sha: string;
    branch: string;
};
export type EngineVersionFormat = `${string}.${string}.${string}-${string}-g${string} ${string}`; // 105.1.1-902-g34d2eb7 BAR105
export const engineVersionFormatRegex = /^(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)-(?<revision>\d+)-g(?<sha>[0-9a-f]+) (?<branch>.*)$/i;
export function isEngineVersionString(version: string): version is EngineVersionFormat {
    return engineVersionFormatRegex.test(version);
}
export function parseEngineVersionString(engineVersionString: EngineVersionFormat): EngineVersion {
    const { major, minor, patch, revision, sha, branch } = engineVersionString.match(engineVersionFormatRegex)!.groups!;
    return { major: Number(major), minor: Number(minor), patch: Number(patch), revision: Number(revision), sha, branch };
}
export const gitEngineTagRegex = /^.*?\{(?<branch>.*?)\}(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)-(?<revision>\d+)-g(?<sha>[0-9a-f]+)$/i;
/**
 * spring_bar_{BAR105}105.1.1-807-g98b14ce -> 105.1.1-902-g34d2eb7 BAR105
 * if the git tag format ever changes then this will break
 * */
export function gitEngineTagToEngineVersionString(gitEngineTag: string): EngineVersionFormat {
    const { major, minor, patch, revision, sha, branch } = gitEngineTag.match(gitEngineTagRegex)!.groups!;
    return `${major}.${minor}.${patch}-${revision}-g${sha} ${branch}`;
}

// Beyond All Reason test-16289-b154c3d
export type GameVersion = {
    game: string;
    tag: string;
    revision: number;
    sha: string;
    fullString: GameVersionFormat;
};
export type GameVersionFormat = `Beyond All Reason ${string}-${number}-${string}`;
export const GameVersionFormatRegex = /^(?<game>Beyond All Reason) (?<tag>\w+)-(?<revision>\d+)-(?<sha>\w+)$/i;
export function isGameVersionString(version: string): version is GameVersionFormat {
    return GameVersionFormatRegex.test(version);
}
export function parseGameVersionString(gameVersionString: GameVersionFormat | string): GameVersion {
    if (!isGameVersionString(gameVersionString)) {
        throw new Error(`Unexpected game version string format: ${gameVersionString}`);
    }
    const { game, tag, revision, sha } = gameVersionString.match(GameVersionFormatRegex)!.groups!;
    return { game, tag, revision: Number(revision), sha, fullString: gameVersionString };
}
