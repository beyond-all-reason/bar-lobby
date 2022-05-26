export class FatalError extends Error {
    constructor(name: string, message: string, stack?: string) {
        super(message);

        this.name = name;
        this.stack = stack;
    }
}
