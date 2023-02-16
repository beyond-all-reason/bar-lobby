import { removeFromArray } from "jaz-ts-utils";
import { v4 as uuid } from "uuid";
import { reactive } from "vue";

import { Alert, Event } from "@/model/notifications";

export class NotificationsAPI {
    public readonly alerts: Array<Alert> = reactive([]);
    public readonly events: Array<Event> = reactive([]);

    public alert(alertConfig: Omit<Alert, "id">) {
        const alert: Alert = {
            id: uuid(),
            timeoutMs: Math.max(alertConfig.text.length * 75, 5000),
            severity: "info",
            ...alertConfig,
        };

        this.alerts.push(alert);
    }

    public event(eventConfig: Omit<Event, "id">) {
        const event: Event = {
            id: uuid(),
            timeoutMs: Math.max(eventConfig.text.length * 75, 10000),
            playSound: true,
            ...eventConfig,
        };

        api.audio.play("ring");

        api.utils.flashFrame(true);

        this.events.push(event);
    }

    public closeNotification(notification: Alert | Event) {
        if (this.alerts.includes(notification)) {
            removeFromArray(this.alerts, notification);
        } else if (this.events.includes(notification)) {
            removeFromArray(this.events, notification);
        }
    }
}
