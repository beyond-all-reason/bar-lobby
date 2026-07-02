// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { app } from "electron";

type SecondInstanceHandler = (argv: string[], workingDirectory: string) => void;

const pendingSecondInstances: Array<{
    argv: string[];
    workingDirectory: string;
}> = [];

let secondInstanceHandler: SecondInstanceHandler | undefined;

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.exit(0);
} else {
    app.on("second-instance", (_event, argv, workingDirectory) => {
        if (secondInstanceHandler) {
            secondInstanceHandler(argv, workingDirectory);
            return;
        }

        pendingSecondInstances.push({ argv, workingDirectory });
    });

    void import("./start-app")
        .then(({ startApp }) =>
            startApp({
                setSecondInstanceHandler(handler: SecondInstanceHandler) {
                    secondInstanceHandler = handler;

                    for (const instance of pendingSecondInstances.splice(0)) {
                        handler(instance.argv, instance.workingDirectory);
                    }
                },
            })
        )
        .catch((error: unknown) => {
            console.error("Failed to start application", error);
            app.exit(1);
        });
}
