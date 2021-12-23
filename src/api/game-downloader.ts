import git from "nodegit";
import axios from "axios";
import { Signal } from "jaz-ts-utils";

/**
 * git managed instance of BAR
 *
 * - wanted to use simple-git which is just a wrapper around git but requires git to be installed on user's system or a portable binary shipped with the lobby
 * - have tried isomorphic-git but struggles with lfs and sometimes just crashes out with EPERM error
 * - nodegit seems to be the most reliable but lacks good typings
 */
export class GameDownloaderAPI {
    public onProgress: Signal<number> = new Signal();

    protected repoUrl: string;
    protected localDirPath: string;

    constructor() {
        this.repoUrl = "https://github.com/beyond-all-reason/Beyond-All-Reason.git";
        this.localDirPath = window.info.userDataPath + "/beyond-all-reason";
    }

    public async fetch() {
        //
    }

    public async fetchLatest() {
        //
    }

    protected async clone() {
        const totalSize = await this.getTotalRepoSize();

        await git.Clone(this.repoUrl, this.localDirPath, {
            fetchOpts: {
                callbacks: {
                    transferProgress: (stats: any) => {
                        this.onProgress.dispatch(stats.receivedBytes() / totalSize);
                    }
                }
            }
        });
    }

    protected async getTotalRepoSize() {
        const repoInfo = await axios.get("https://api.github.com/repos/beyond-all-reason/Beyond-All-Reason");
        const totalSize = repoInfo.data.size * 1024;

        return totalSize;
    }
}