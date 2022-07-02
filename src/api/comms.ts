import { TachyonClient } from "tachyon-client";

import { TachyonSpadsBattle } from "@/model/battle/tachyon-spads-battle";
import { tachyonLog } from "@/utils/tachyon-log";

export class CommsAPI extends TachyonClient {
    constructor(config: ConstructorParameters<typeof TachyonClient>[0]) {
        super({
            ...config,
            verbose: true,
            logMethod: tachyonLog,
        });

        this.onConnect.add(() => {
            console.log(`Connected to ${config.host}:${config.port}`);
            api.session.offlineMode.value = false;

            this.socket?.on("close", () => {
                console.log(`Disconnected from ${config.host}:${config.port}`);
                api.session.offlineMode.value = true;
            });
        });

        this.onResponse("s.system.server_event").add((data) => {
            if (data.event === "server_restart") {
                api.session.offlineMode.value = true;

                api.alerts.alert({
                    type: "notification",
                    severity: "warning",
                    content: "Server is restarting",
                });
            }
        });

        this.onResponse("s.system.server_event").add((data) => {
            if (data.event === "stop") {
                api.alerts.alert({
                    type: "notification",
                    severity: "warning",
                    content: "Server is shutting down",
                });
            }
        });

        this.onResponse("s.lobby.join_response").add((data) => {
            if (data.result === "approve") {
                // TODO: might need to request fresh client info here for cases where we don't already know about them (e.g. server forcing us into a battle)

                api.session.onlineBattle = new TachyonSpadsBattle(data.lobby);

                api.router.push("/multiplayer/battle");
            }
        });

        this.onResponse("s.lobby.updated").add((data) => {
            const battle = api.session.onlineBattle;
            if (!battle || data.lobby.id !== battle?.battleOptions.id) {
                console.warn("Not updating battle because it's not the current battle");
                return;
            }

            battle.handleServerResponse(data.lobby);
        });
    }
}
