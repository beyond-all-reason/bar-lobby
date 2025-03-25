export class Logger {
    filename: string;
    constructor(filename: string) {
        this.filename = filename;
    }

    debug(msg: string) {
        window.logFile.log(this.filename, "debug", msg);
    }

    info(msg: string) {
        window.logFile.log(this.filename, "info", msg);
    }

    error(msg: string) {
        window.logFile.log(this.filename, "error", msg);
    }

    fatal(msg: string) {
        window.logFile.log(this.filename, "fatal", msg);
    }
}

export async function uploadLogs() {
    return await window.logFile.upload();
}
