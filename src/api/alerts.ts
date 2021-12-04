import { Ref, ref } from "vue-demi";

export type AlertType = "info" | "error" | "warning";

export class AlertsAPI {
    protected alertTitle = ref("");
    protected alertMessage = ref("");
    protected alertType: Ref<AlertType> = ref("info");
    protected alertIsFatal = ref(false);

    public alert(message: string, type: AlertType = "info", isFatal = false, title = type.toUpperCase()) {
        this.alertTitle.value = title;
        this.alertMessage.value = message;
        this.alertType.value = type;
        this.alertIsFatal.value = isFatal;
    }

    public getAlert() {
        return {
            title: this.alertTitle,
            message: this.alertMessage,
            type: this.alertType,
            isFatal: this.alertIsFatal,
        };
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