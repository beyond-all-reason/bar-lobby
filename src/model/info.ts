export interface Info {
    lobby: {
        name: string;
        version: string;
        hash: string;
    };
    userDataPath: string;
    contentPath: string;
    hardware: {
        numOfDisplays: number;
        currentDisplayIndex: number;
    }
}