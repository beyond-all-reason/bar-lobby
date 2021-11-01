import { createRouter, createWebHashHistory } from "vue-router";
import routes from "vue-auto-routing";
import { createRouterLayout } from "vue-router-layout";

const RouterLayout = createRouterLayout(layout => {
    return import("@/layouts/" + layout + ".vue");
});

const router = createRouter({
    history: createWebHashHistory(process.env.BASE_URL),
    routes: [
        {
            path: "/splash",
            component: RouterLayout,
            children: routes
        }
    ]
});

export default router;
