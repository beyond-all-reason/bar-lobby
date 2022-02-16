export type AI = {
    id: string; // i.e. shortName
    name: string;
    version: string;
    description: string;
    url?: string;
    loadSupported: boolean;
    interfaceShortName: string;
    interfaceVersion: string;
    ddlPath: string;
    options?: Record<string, any>;
};