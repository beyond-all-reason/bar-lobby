import axios from "axios";
import { Signal } from "jaz-ts-utils";
import git from "isomorphic-git";
import http from "isomorphic-git/http/node";
import * as fs from "fs";

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
        //this.repoUrl = "https://github.com/beyond-all-reason/Beyond-All-Reason.git";
        this.repoUrl = "https://github.com/Jazcash/sdfz-demo-parser.git";
        this.localDirPath = window.info.userDataPath + "/beyond-all-reason";
    }

    public async fetch() {
        //
    }

    public async fetchLatest() {
        // todo: is checked out already?
        await this.clone();
    }

    protected async clone() {
        //const totalSize = await this.getTotalRepoSize();

        await git.clone({
            fs,
            http,
            dir: this.localDirPath,
            url: this.repoUrl,
            onProgress: (event) => {
                console.log(event);
                //this.onProgress.dispatch(event.loaded / event.total);
            }
        });
    }

    protected async getTotalRepoSize() {
        const repoInfo = await axios.get("https://api.github.com/repos/beyond-all-reason/Beyond-All-Reason");
        const totalSize = repoInfo.data.size * 1024;

        return totalSize;
    }

    protected async getHead() : Promise<string | void> {
        return await git.currentBranch({
            fs,
            dir: this.localDirPath
        });
    }
}