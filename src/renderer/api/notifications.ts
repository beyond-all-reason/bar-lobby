import { removeFromArray } from "$/jaz-ts-utils/object";
import { reactive } from "vue";

import { Alert, Event } from "@renderer/model/notifications";
import { audioApi } from "../audio/audio";

let notificationId = 0;

class NotificationsAPI {
    public readonly alerts: Array<Alert> = reactive([]);
    public readonly events: Array<Event> = reactive([]);

    public alert(alertConfig: Omit<Alert, "id">) {
        notificationId++;
        const alert: Alert = {
            id: notificationId.toString(),
            timeoutMs: Math.max(alertConfig.text.length * 75, 5000),
            severity: "info",
            ...alertConfig,
        };
        this.alerts.push(alert);
    }

    public event(eventConfig: Omit<Event, "id">) {
        notificationId++;
        const event: Event = {
            id: notificationId.toString(),
            timeoutMs: Math.max(eventConfig.text.length * 75, 10000),
            playSound: true,
            ...eventConfig,
        };
        audioApi.play("ring");
        window.mainWindow.flashFrame(true);
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

export const notificationsApi = new NotificationsAPI();
