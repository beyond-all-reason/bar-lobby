export interface LuaOption {
    type: "section" | "number" | "boolean" | "string" | "list";
    key: string;
    name: string;
    description?: string;
    hidden?: boolean;
}

export interface LuaOptionSection extends LuaOption {
    type: "section";
    options: Array<LuaOptionNumber | LuaOptionBoolean | LuaOptionString | LuaOptionList>;
}

export interface LuaOptionNumber extends LuaOption {
    type: "number";
    default: number;
    step: number;
    min?: number;
    max?: number;
}

export interface LuaOptionBoolean extends LuaOption {
    type: "boolean";
    default: boolean;
}

export interface LuaOptionString extends LuaOption {
    type: "string";
    default: string;
}

export interface LuaOptionList extends LuaOption {
    type: "list";
    options: LuaOption[];
    default: string;
}
