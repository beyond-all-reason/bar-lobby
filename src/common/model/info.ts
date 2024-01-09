export type Info = {
    resourcesPath: string;
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
    steamSessionTicket: string;
};
