import { onMounted, onUnmounted } from "vue";

export function setIdleTimer(onIdle: () => void, onBack: () => void, seconds: number) {
    let timer, timer_running;

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
            onIdle();
            timer_running = false;
        }, seconds * 1000);
        timer_running = true;
    }

    function resetTimer() {
        if (!timer_running) {
            onBack();
        }
        clearTimeout(timer);
        setupTimer();
    }
}
