import "@/styles/styles.scss";
import { createApp } from "vue";
import App from "./App.vue";
import store from "./store";
import Icon from "@/components/common/Icon.vue";
import Panel from "@/components/common/Panel.vue";

const app = createApp(App);

app.use(store);

app.component("Icon", Icon);
app.component("Panel", Panel);

app.mount("#app");

document.querySelectorAll("button").forEach((button) => {
    button.addEventListener("mouseover", () => {
        const buttonClickSound = new Audio(require("./assets/sounds/ui/button-hover.mp3"));
        buttonClickSound.volume = 0.1;
        buttonClickSound.play();
    });
});