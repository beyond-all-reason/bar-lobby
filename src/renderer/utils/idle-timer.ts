import { onMounted, onUnmounted } from "vue";

export interface IdleBehavior {
    onIdle?: () => void;
    onBack?: () => void;
    seconds?: number;
}

export function setIdleTimer(initial: IdleBehavior) {
    let timer, timer_running;

    const { onIdle, onBack, seconds } = initial;

    let currentOnIdle =
        onIdle ??
        (() => {
            let x;
        });
    let currentOnBack =
        onBack ??
        (() => {
            let x;
        });
    let currentSeconds = seconds ?? 5;

    setupTimer();

    onMounted(() => {
        window.addEventListener("mousemove", resetTimer);
        window.addEventListener("keypress", resetTimer);
    });

    onUnmounted(() => {
        window.removeEventListener("mousemove", resetTimer);
        window.removeEventListener("keypress", resetTimer);
    });

    function setupTimer() {
        timer = setTimeout(() => {
            currentOnIdle();
            timer_running = false;
        }, currentSeconds * 1000);
        timer_running = true;
    }

    function resetTimer() {
        if (!timer_running) {
            currentOnBack();
        }
        clearTimeout(timer);
        setupTimer();
    }

    function setIdleBehavior(update: IdleBehavior) {
        const { onIdle, onBack, seconds } = update;
        if (onIdle != null) currentOnIdle = onIdle;
        if (onBack != null) currentOnBack = onBack;
        if (seconds != null) currentSeconds = seconds;
    }

    return setIdleBehavior;
}
