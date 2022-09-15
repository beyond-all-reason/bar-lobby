import { DemoParser } from "sdfz-demo-parser";

import { exposeWorkerFunctions } from "@/workers/worker-helpers";

const demoParser = new DemoParser();

async function parseReplay(replayPath: string) {
    return demoParser.parseDemo(replayPath);
}

export default exposeWorkerFunctions({
    parseReplay,
});
