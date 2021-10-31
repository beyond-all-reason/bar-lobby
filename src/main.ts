import "@/styles/styles.scss";
import { createApp } from "vue";
import { createRouter, createWebHashHistory } from "vue-router";
import App from "./App.vue";
import store from "./store";
import Icon from "@/components/common/Icon.vue";
import Panel from "@/components/common/Panel.vue";
import Button from "@/components/common/Button.vue";
import Test from "@/routes/Test.vue";
import Page from "@/routes/Home.vue";

const app = createApp(App);

const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        {
            path: "/", component: Test
        },
        {
            path: "/test", component: Page
        }
    ]
});

app.use(router);
app.use(store);

app.component("Icon", Icon);
app.component("Panel", Panel);
app.component("Button", Button);

app.mount("#app");