export interface UserConfig {
    userId: number;
    username: string;
    skill: Record<string, number>;
    icons: Record<string, string>;
    isBot?: boolean;
    legacyId?: number;
    clanId?: number;
    status?: { isInGame: boolean; isAway: boolean; };
}

export class User implements UserConfig {
    public userId: number;
    public username: string;
    public skill: Record<string, number>;
    public icons: Record<string, string>;
    public isBot?: boolean;
    public legacyId?: number;
    public clanId?: number;
    public status?: { isInGame: boolean; isAway: boolean; };

    constructor(config: UserConfig) {
        this.userId = config.userId;
        this.username = config.username;
        this.skill = config.skill;
        this.icons = config.icons;
        this.isBot = config.isBot ?? false;
        this.legacyId = config.legacyId;
        this.clanId = config.clanId;
        this.status = config.status ?? { isInGame: false, isAway: false };
    }
}

export class CurrentUser extends User {
    permissions!: string[];
    friendUserIds!: number[];
    friendRequestUserIds!: number[];
    ignoreUserIds!: number[];

    constructor(args: typeof CurrentUser.prototype) {
        super(args);
    }
}