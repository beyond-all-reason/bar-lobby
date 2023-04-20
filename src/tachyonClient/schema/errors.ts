export class ServerClosedError extends Error {
    constructor() {
        super("server unexpectedly closed the connection");
    }
}

export class NotConnectedError extends Error {
    constructor() {
        super("not connected to server");
    }
}
