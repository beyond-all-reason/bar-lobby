export function tachyonLog(...data: any[]) {
    for (const part of data) {
        if (typeof part === "object") {
            if (part.cmd && !part.cmd.includes("ping") && !part.cmd.includes("pong")) {
                console.log(...data);
            }
        }
    }
}