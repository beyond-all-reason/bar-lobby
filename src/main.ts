import { createApp } from "vue";

import "@/styles/styles.scss";
import store from "@/store";
import App from "@/App.vue";
import Icon from "@/components/common/Icon.vue";
import Panel from "@/components/common/Panel.vue";
import Button from "@/components/common/Button.vue";
import router from "./router";

const app = createApp(App).use(router);

app.use(store);

app.component("Icon", Icon);
app.component("Panel", Panel);
app.component("Button", Button);

app.mount("#app");