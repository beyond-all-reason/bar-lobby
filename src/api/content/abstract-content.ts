export class AbstractContentAPI {
    protected userDataDir: string;
    protected dataDir: string;

    constructor(userDataDir: string, dataDir: string) {
        this.userDataDir = userDataDir;
        this.dataDir = dataDir;
    }
}