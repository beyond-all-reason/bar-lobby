// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// One-off moments logic reports to the screen, named for what happened. Presentation decides what each looks like.
export interface Ui {
    matchWaiting(): void;
    queuesJoined(): void;
    queueListFailed(): void;
}

let implementation: Ui | undefined;

export function provideUi(ui: Ui) {
    implementation = ui;
}

export const ui: Ui = {
    matchWaiting: () => implementation?.matchWaiting(),
    queuesJoined: () => implementation?.queuesJoined(),
    queueListFailed: () => implementation?.queueListFailed(),
};
