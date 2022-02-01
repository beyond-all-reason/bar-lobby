const { parentPort } = require("worker_threads");

const stuff: number | string = "hi";

console.log(stuff);

parentPort.postMessage("Hello");