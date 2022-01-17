import axios from "axios";
import { Octokit } from "octokit";

export class HTTPDownloaderAPI {
    protected contentPath: string;
    protected ocotokit = new Octokit();

    constructor(contentPath: string) {
        this.contentPath = contentPath;
    }

    public async downloadLatestEngine(includePrerelease = true) {
        // At the time of writing, all releases are marked as prerelease, but in the future this should hopefully change
        // to only experimental builds being marked as prereleases. Then we can set this flag default to false
        const stuff = await this.ocotokit.rest.repos.getLatestRelease({
            owner: "beyond-all-reason",
            repo: "spring",
        });

        console.log(stuff);
    }

    public async download(url: string, destination: string) {
        const file = await axios({
            url,
            method: "get",
            responseType: "blob"
        });

        file.data;
    }
}