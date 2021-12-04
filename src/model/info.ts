export interface Info {
    lobby: {
        name: string;
        version: string;
        hash: string;
    };
    settingsPath: string;
    hardware: {
        numOfDisplays: number;
        currentDisplayIndex: number;
    }
}