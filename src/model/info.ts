export interface Info {
    lobby: {
        name: string;
        version: string;
        hash: string;
    };
    userDataPath: string;
    appPath: string;
    hardware: {
        numOfDisplays: number;
        currentDisplayIndex: number;
    }
}