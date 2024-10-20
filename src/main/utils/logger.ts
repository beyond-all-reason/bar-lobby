import pino from "pino";
import PinoPretty from "pino-pretty";

const stream = PinoPretty({
    messageFormat: "{filename}{separator}{msg}",
    ignore: "pid,hostname,filename,separator",
    colorize: true,
});
const parentLogger = pino(stream);

interface LoggerOptions {
    separator: string;
    level: string;
}
export function logger(filename: string, options?: LoggerOptions) {
    const separator = options?.separator || " - ";
    const level = options?.level || "debug";
    return parentLogger.child(
        { filename, separator },
        {
            level,
        }
    );
}
