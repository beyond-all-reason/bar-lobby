import fs from "fs";

/**
 * An error occurs because for some reason the app looks for the better-sqlite3 bindings in the root folder, but they actually get built to
 * node_modules/better-sqlite3/build. This script copies the bindings to the root folder.
 * https://github.com/WiseLibs/better-sqlite3/issues/480
 */

await fs.promises.cp("./node_modules/better-sqlite3/build/", ".", { recursive: true });
