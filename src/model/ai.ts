export type AI = {
    shortName: string;
    name: string;
    version: string;
    description: string;
    url?: string;
    loadSupported: boolean;
    interfaceShortName: string;
    interfaceVersion: string;
    ddlPath: string;
    options?: Array<{ type: "section" | "bool" | "string" | "number" | "list", key: string, name: string, desc: string }>; // TODO: standardise the model for these with modoptions
};