<template>
    <div class="nav">
        <div class="left">
            <Button class="primary-item logo" active-class="active" depress to="/home">
                <img src="@/assets/images/logo.svg">
            </Button>
            <Button class="primary-item" active-class="active" to="/campaign">Campaign</Button>
            <Button class="primary-item" active-class="active" to="/missions">Missions</Button>
            <Button class="primary-item" active-class="active" to="/versus">Versus</Button>
            <Button class="primary-item" active-class="active" to="/replays">Replays</Button>
        </div>
        <div class="right">
            <Button class="primary-item" active-class="active" to="/profile">
                Jazcash
            </Button>
            <Button class="primary-item icon" active-class="active" to="/settings">
                <Icon icon="cog" :size="40" />
            </Button>
            <Button class="primary-item icon" to="/">
                <Icon icon="close-thick" :size="40" />
            </Button>
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
    &:hover img, &.active img {
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
