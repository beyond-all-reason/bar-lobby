// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// Changes to one file run one after another, so two changes made close together both land, in order. A task
// that throws doesn't stop the ones queued after it.
const queues = new Map<string, Promise<unknown>>();

export function queued<T>(filePath: string, task: () => Promise<T>): Promise<T> {
    const run = (queues.get(filePath) ?? Promise.resolve()).then(task);
    const settled = run.catch(() => {});
    queues.set(filePath, settled);
    settled.then(() => {
        if (queues.get(filePath) === settled) {
            queues.delete(filePath);
        }
    });

    return run;
}
