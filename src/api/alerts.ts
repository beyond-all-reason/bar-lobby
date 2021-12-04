import { Ref, ref } from "vue-demi";

export type AlertType = "info" | "error" | "warning";

export class AlertsAPI {
    public alertTitle = ref("");
    public alertMessage = ref("");
    public alertType: Ref<AlertType> = ref("info");
    public alertIsFatal = ref(false);

    public alert(message: string, type: AlertType = "info", isFatal = false, title = type.toUpperCase()) {
        this.alertTitle.value = title;
        this.alertMessage.value = message;
        this.alertType.value = type;
        this.alertIsFatal.value = isFatal;
    }

    public clearAlert() {
        this.alertTitle.value = "";
        this.alertMessage.value = "";
        this.alertType.value = "info";
        this.alertIsFatal.value = false;
    }

    public toast(message: string) {
        // todo
    }

    public clearToast() {
        // todo
    }
}