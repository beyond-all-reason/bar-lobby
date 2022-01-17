/**
 * This is an experimental API that hasn't been able to get off the ground due to lack of portable git binaries
 *
 * General idea is to download BAR via git clone. Pulling latest version would simply be a fetch and switching to
 * other versions for watching replays would be a simple checkout.
 *
 * Server:
 * 1. clone as mirror: git clone --mirror https://github.com/beyond-all-reason/Beyond-All-Reason.git
 * 2. mv hooks/post-update.sample hooks/post-update
 * 3. sudo chmod a+x hooks/post-update
 * 4. git update-server-info
 * 5. sudo chown -R www-data:www-data /var/www/git
 *
 * Client:
 * - git clone https://github.com/beyond-all-reason/Beyond-All-Reason.git
 * - --filter=blob:none could be useful but isn't supported by current git-http-backend
 * - --depth=1 can be used to avoid downloading all the history
 * - --single-branch --branch master if not caring about other branches
 * - https://github.blog/2020-12-21-get-up-to-speed-with-partial-clone-and-shallow-clone/
 */

import * as path from "path";
import axios from "axios";
import { Signal } from "jaz-ts-utils";
//import git from "@jazcash/isomorphic-git";
//import Git from "nodegit";

export class GitDownloaderAPI {
    public onProgress: Signal<{ totalBytes: number; currentBytes: number; percent: number; }> = new Signal();

    protected repoUrl: string;
    protected localDirPath: string;
    protected bytesDownloaded = 0;

    constructor(contentPath: string) {
        //this.repoUrl = "https://github.com/beyond-all-reason/Beyond-All-Reason.git";
        this.repoUrl = "https://jazcash.com/git/Jazcash/Beyond-All-Reason.git";
        this.localDirPath = path.join(contentPath, "beyond-all-reason");
    }

    public async fetch() {
        //
    }

    public async fetchLatest() {
        const totalBytes = await this.getTotalRepoSize();

        // await Git.Clone(this.repoUrl, this.localDirPath, {
        //     fetchOpts: {
        //         callbacks: {
        //             transferProgress: function(stats: any) {
        //                 console.log(stats.receivedBytes() / totalBytes);
        //             }
        //         }
        //     }
        // });

        // const cache = {};

        // await git.clone({
        //     fs,
        //     http,
        //     dir: this.localDirPath,
        //     url: this.repoUrl,
        //     noCheckout: true,
        //     cache,
        //     onProgress: (event) => {
        //         console.log(event);
        //         //this.onProgress.dispatch(event.loaded / event.total);
        //     },
        //     onData: (bytes) => {
        //         this.bytesDownloaded += bytes;
        //         this.onProgress.dispatch({
        //             totalBytes,
        //             currentBytes: this.bytesDownloaded,
        //             percent: this.bytesDownloaded / totalBytes
        //         });
        //     }
        // });

        // await git.checkout({
        //     dir: this.localDirPath,
        //     fs,
        //     cache,
        //     onProgress: (event) => {
        //         console.log(event);
        //     },
        // });
    }

    // protected async clone() {

    // }

    // protected async checkout() {
    //     await git.checkout({
    //         dir: this.localDirPath,
    //         fs,
    //         onProgress: (event) => {
    //             console.log(event);
    //         },
    //     });
    // }

    protected async getTotalRepoSize() {
        const repoInfo = await axios.get("https://jazcash.com/git/api/v1/repos/jazcash/Beyond-All-Reason");
        const totalSize = repoInfo.data.size * 1024;

        return totalSize;
    }
}