import { ref, type Ref } from "vue";
import type { RouteLocationNormalized } from "vue-router";

const isOpen = ref(false);
const intendedRoute = ref<RouteLocationNormalized | null>(null);

export function useLogInConfirmation() {
    return {
        isOpen: isOpen as Ref<boolean>,
        intendedRoute: intendedRoute as Ref<RouteLocationNormalized | null>,
        openLogInConfirmation(route: RouteLocationNormalized) {
            intendedRoute.value = route;
            isOpen.value = true;
        },
        closeLogInConfirmation() {
            intendedRoute.value = null;
            isOpen.value = false;
        },
    };
}
