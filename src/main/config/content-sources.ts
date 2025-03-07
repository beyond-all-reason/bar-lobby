import axios from "axios";

export const contentSources = {
    rapid: {
        host: "repos-cdn.beyondallreason.dev",
        game: "byar",
    },
    gameGithub: {
        owner: "beyond-all-reason",
        repo: "Beyond-All-Reason",
    },
    engineGitHub: {
        owner: "beyond-all-reason",
        repo: "spring",
    },
};

export interface EngineReleaseInfo {
    filename: string;
    springname: string;
    md5: string;
    category: string;
    version: string;
    path: string;
    tags: string[];
    size: number;
    timestamp: string;
    mirrors: string[];
}

const findEngineReleaseUrl = (engineVersion: string) => {
    const archStr = process.platform === "win32" ? "engine_windows64" : "engine_linux64";
    const url = new URL("https://files-cdn.beyondallreason.dev/find");
    url.searchParams.set("category", archStr);
    url.searchParams.set("springname", engineVersion);
    return url;
};

export const getEngineReleaseInfo = async (engineVersion: string) => {
    const engineReleaseUrl = findEngineReleaseUrl(engineVersion);
    const engineResponse = await axios.get(engineReleaseUrl.toString());
    const engineInfo: EngineReleaseInfo = engineResponse.data[0];
    return engineInfo;
};
