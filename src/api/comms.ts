import { TachyonClient } from "tachyon-client";

import { tachyonLog } from "@/utils/tachyon-log";

export class CommsAPI extends TachyonClient {
    constructor(config: ConstructorParameters<typeof TachyonClient>[0]) {
        super({
            ...config,
            verbose: true,
            logMethod: tachyonLog,
        });

        this.socket?.on("connect", () => (api.session.offlineMode.value = false));
        this.socket?.on("close", () => (api.session.offlineMode.value = true));

        this.onResponse("s.system.server_event").add((data) => {
            if (data.event === "server_restart") {
                api.session.offlineMode.value = true;
                //api.modals.show("server_restart"); // TODO: error modal
            }
        });

        this.onResponse("s.lobby.join").add((data) => {
            // TODO
        });
    }
}
