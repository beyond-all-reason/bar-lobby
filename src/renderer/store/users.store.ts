import { User } from "@main/model/user";
import { reactive } from "vue";

export const usersStore = reactive({
    users: Array<User>,
});
