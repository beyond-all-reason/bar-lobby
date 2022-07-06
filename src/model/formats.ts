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
