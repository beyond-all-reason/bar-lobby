<template>
    <div class="nav">
        <div class="left">
            <router-link class="primary-item logo" :class="{ selected: route.path === '/home' }" depress to="/home" >
                <img src="@/assets/images/logo.svg">
            </router-link>
            <router-link class="primary-item" :class="{ selected: route.path.split('/')[1] === 'campaign' }" to="/campaign">Campaign</router-link>
            <router-link class="primary-item" :class="{ selected: route.path.split('/')[1] === 'missions' }" to="/missions">Missions</router-link>
            <router-link class="primary-item" :class="{ selected: route.path.split('/')[1] === 'versus' }" to="/versus">Versus</router-link>
            <router-link class="primary-item" :class="{ selected: route.path.split('/')[1] === 'replays' }" to="/replays">Replays</router-link>
        </div>
        <div class="right">
            <router-link class="primary-item" to="/profile">
                Jazcash
            </router-link>
            <router-link class="primary-item icon" to="/settings">
                <Icon icon="cog" :size="40" />
            </router-link>
            <router-link class="primary-item icon" to="/">
                <Icon icon="close-thick" :size="40" />
            </router-link>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useRoute } from "vue-router";

export default defineComponent({
    setup() {
        const route = useRoute();

        return { route };
    }
});
</script>

<style scoped lang="scss">
.nav {
    position: relative;
    display: flex;
    justify-content: space-between;
    box-shadow: 0 3px 5px rgba(0, 0, 0, 0.5);
    border-bottom: 1px solid rgba(255, 255, 255, 0.15);
    &:before {
        @extend .fullsize;
        @extend .panel-background;
        content: "";
        z-index: -1;
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
    &:hover img, &.selected img {
        opacity: 1;
    }
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
    color: rgba(255, 255, 255, 0.8);
    display: flex;
    align-items: center;
    transition: all .05s;
    .left & {
        box-shadow: 1px 0 0 rgba(255, 255, 255, 0.1);
    }
    .right & {
        box-shadow: -1px 0 0 rgba(255, 255, 255, 0.1);
    }
    &:hover {
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
            -7px -3px 10px rgba(0, 0, 0, 0.5) !important;
    }
    &.selected {
        color: #fff;
        text-shadow: 0 0 7px #fff;
        .left & {
            box-shadow: 1px 0 0 rgba(255, 255, 255, 0.1), 0 1px 0 rgba(255, 255, 255, 0.2);
        }
        .right & {
            box-shadow: -1px 0 0 rgba(255, 255, 255, 0.1), 0 1px 0 rgba(255, 255, 255, 0.2);
        }
    }
    &.icon {
        padding: 10px 15px;
    }
}
</style>
