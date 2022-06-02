import { v4 as uuid } from "uuid";
import { reactive } from "vue";

import { EventAlert, NotificationAlert } from "@/model/alert";

export class AlertsAPI {
    public readonly alerts: Array<NotificationAlert | EventAlert> = reactive([]);

    public alert(alert: NotificationAlert | EventAlert) {
        alert.timeoutMs ??= 3000;
        alert.id = uuid();

        this.alerts.push(alert);
    }

    public closeAlert(alert: NotificationAlert | EventAlert) {
        this.alerts.splice(this.alerts.indexOf(alert), 1);
    }
}
