<template>
    <div class="nav">
        <Panel class="logo-panel">
            <Button class="primary-item logo" depress to="/home" >
                <img src="@/assets/images/logo.svg">
            </Button>
        </Panel>
        <div class="nav-items">
            <Panel class="primary-nav">
                <div class="row">
                    <div class="left">
                        <Button class="primary-item" v-for="(route, id) in routes" :key="id" @mouseover="selectedPrimaryRoute = id">
                            {{ id }}
                        </Button>
                    </div>
                    <div class="right">
                        <Button class="primary-item" to="/profile">
                            Jazcash
                        </Button>
                        <Button class="primary-item icon" to="/settings">
                            <Icon icon="cog" :size="40" />
                        </Button>
                        <Button class="primary-item icon">
                            <Icon icon="close-thick" :size="40" />
                        </Button>
                    </div>
                </div>
            </Panel>
            <Panel class="secondary-nav">
                <Button class="secondary-item" v-for="secondaryRoute in secondaryRoutes" :key="secondaryRoute.name" :to="secondaryRoute.path">
                    {{ secondaryRoute.name }}
                </Button>
            </Panel>
        </div>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from "vue";
import { RouteLocation, useRoute, useRouter } from "vue-router";

export default defineComponent({
    setup() {
        const router = useRouter();
        const route = useRoute();

        const primaryRoutes = ["campaign", "missions", "replays", "versus"];

        const allRoutes = ref(router.getRoutes());
        const routes = computed(() => Object.assign({}, ...primaryRoutes.map(primaryRoute => {
            return {
                [primaryRoute]: allRoutes.value.filter(route => route.path.split("/")[1] === primaryRoute)
            };
        })) as { [key: string]: RouteLocation[] });

        const selectedPrimaryRoute = ref("");
        const secondaryRoutes = computed(() => routes.value[selectedPrimaryRoute.value] || []);

        return { routes, selectedPrimaryRoute, secondaryRoutes };
    }
});
</script>

<style scoped lang="scss">
.nav {
    display: flex;
    box-shadow: 0 3px 5px rgba(0, 0, 0, 0.5), 0 1px 0 rgba(255, 255, 255, 0.2);
}
.logo-panel {
    padding: 0;
    display: flex;
    border: none;
    border-right: 1px solid hsl(0, 0%, 17%);
    box-shadow: none;
    &:hover {
        z-index: 2;
        box-shadow: 5px -2px 5px rgba(0, 0, 0, 0.5);
    }
}
.logo {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-shrink: 0;
    height: 100%;
    img {
        height: 40px;
        opacity: 0.9;
    }
    &:hover img {
        opacity: 1;
    }
    &:active:not(.selected) {
        background: linear-gradient(rgba(0, 0, 0, 0.4), rgba(202, 202, 202, 0.1));
        box-shadow: inset 0 0 25px rgba(0, 0, 0, 0.7) !important;
        color: rgba(255, 255, 255, 0.4);
        text-shadow: none;
    }
}
.nav-items {
    display: flex;
    flex-grow: 1;
    flex-direction: column;
}
.primary-nav {
    padding: 0;
    border: none;
    border-bottom: 1px solid #272727;
}
.row {
    display: flex;
    justify-content: space-between;
}
.left, .right {
    display: flex;
    gap: 1px;
}
.primary-item {
    padding: 10px 25px;
    font-size: 25px;
    font-weight: 600;
    background: radial-gradient(rgba(0, 0, 0, 0), rgba(255, 255, 255, 0.05));
    color: rgba(255, 255, 255, 0.9);
    display: flex;
    align-items: center;
    .left & {
        box-shadow: 1px 0 0 rgba(255, 255, 255, 0.1);
    }
    .right & {
        box-shadow: -1px 0 0 rgba(255, 255, 255, 0.1);
    }
    &:hover:not(.selected) {
        background: radial-gradient(rgba(0, 0, 0, 0), rgba(255, 255, 255, 0.12));
        color: #fff;
        text-shadow: 0 0 7px #fff;
        z-index: 1;
        border-radius: 1px;
        box-shadow: 
            1px 0 0 rgba(255, 255, 255, 0.2),
            -1px 0 0 rgba(255, 255, 255, 0.2),
            0 1px 0 rgba(255, 255, 255, 0.4),
            7px -3px 10px rgba(0, 0, 0, 0.5),
            -7px -3px 10px rgba(0, 0, 0, 0.5);
    }
    &.selected {
        background: linear-gradient(rgba(255, 255, 255, 0), rgba(0, 0, 0, 0.4));
        color: #fff;
        text-shadow: 0 0 7px #fff;
    }
    &.icon {
        padding: 10px 15px;
    }
}
.secondary-nav {
    padding: 0;
    border: none;
    font-weight: 600;
    background: linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.9));
    display: flex;
    flex-direction: row;
    box-shadow: none;
    height: 30px;
    box-shadow: inset 0 4px 6px rgba(0, 0, 0, 0.7);
}
.secondary-item {
    display: flex;
    align-items: center;
    padding: 0 30px;
    height: 100%;
    color: rgba(255, 255, 255, 0.6);
    &:hover {
        color: #fff;
    }
    &:not(:last-child) {
        position: relative;
        &:after {
            @extend %pseudo-fill;
            background: rgba(255, 255, 255, 0.1);
            width: 1px;
            height: 70%;
            top: 50%;
            transform: translateY(-50%);
            left: unset;
            right: 0px;
        }
    }
}
</style>
