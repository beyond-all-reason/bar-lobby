import { TachyonClient, TachyonClientOptions } from "tachyon-client";

type TachyonAPIConfig = TachyonClientOptions

export class TachyonAPI {
    protected config: TachyonAPIConfig;
    protected client: TachyonClient;

    constructor(config: TachyonAPIConfig) {
        this.config = config;

        this.client = new TachyonClient(config);
    }
}