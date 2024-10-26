import { CurrentUser } from "@main/model/user";
import { reactive, readonly } from "vue";

export const _me = reactive({
    userId: 0,
    isOnline: false,
    username: "Player",
} as CurrentUser);

export const me = readonly(_me);
