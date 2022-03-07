
export interface ModOption {
    key: string;
    name: string;
    description?: string;
    hidden?: boolean;
}

export interface ModOptionSection extends ModOption {
    options: ModOption[];
}

export interface ModOptionNumber extends ModOption {
    default: number;
    step: number;
    min?: number;
    max?: number;
}

export interface ModOptionBoolean extends ModOption {
    default: boolean;
}

export interface ModOptionList extends ModOption {
    options: ModOption[];
    default: string;
}