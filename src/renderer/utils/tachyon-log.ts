const hideCmds = ["c.system.ping", "s.system.pong", "s.system.server_stats"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function tachyonLog(...data: any[]) {
    for (const part of data) {
        if (typeof part === "object") {
            if (part.cmd && !hideCmds.includes(part.cmd)) {
                console.debug(...data);
            }
        }
    }
}
