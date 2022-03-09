
export interface ModOption {
    type: string;
    key: string;
    name: string;
    description?: string;
    hidden?: boolean;
}

export interface ModOptionSection extends ModOption {
    type: "section";
    options: ModOption[];
}

export interface ModOptionNumber extends ModOption {
    type: "number";
    default: number;
    step: number;
    min?: number;
    max?: number;
}

export interface ModOptionBoolean extends ModOption {
    type: "boolean";
    default: boolean;
}

export interface ModOptionList extends ModOption {
    type: "list";
    options: ModOption[];
    default: string;
}

export function isNumberOption(modOption: ModOption) : modOption is ModOptionNumber {
    return modOption.type === "number";
}

export function isBooleanOption(modOption: ModOption) : modOption is ModOptionBoolean {
    return modOption.type === "boolean";
}

export function isListOption(modOption: ModOption) : modOption is ModOptionList {
    return modOption.type === "list";
}

export function isSectionOption(modOption: ModOption) : modOption is ModOptionSection {
    return modOption.type === "section";
}