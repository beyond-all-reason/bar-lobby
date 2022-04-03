export class User {
    id!: number;
    username!: string;
    skill!: Record<string, number>;
    icons!: Record<string, string>;
    isBot?: boolean;
    legacyId?: number;
    clanId?: number;
    status?: { isInGame: boolean; isAway: boolean; };

    constructor(args: typeof User.prototype) {
        Object.assign(this, args);
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