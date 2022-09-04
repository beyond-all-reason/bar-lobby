export interface Info {
    appPath: string;
    contentPath: string;
    configPath: string;
    lobby: {
        name: string;
        version: string;
        hash: string;
    };
    hardware: {
        numOfDisplays: number;
        currentDisplayIndex: number;
    };
}
