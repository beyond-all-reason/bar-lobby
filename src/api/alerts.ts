import { reactive } from "vue";

import { EventAlert, NotificationAlert } from "@/model/alert";

export class AlertsAPI {
    public readonly alerts: Array<NotificationAlert | EventAlert> = reactive([]);

    public alert(alert: NotificationAlert | EventAlert) {
        this.alerts.push(alert);
    }

    public closeAlert(alert: NotificationAlert | EventAlert) {
        this.alerts.splice(this.alerts.indexOf(alert), 1);
    }
}
