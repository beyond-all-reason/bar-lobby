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
    &:before {
        @extend .fullsize;
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
    display: flex;
    align-items: center;
    &.icon {
        padding: 10px 15px;
    }
}
</style>
