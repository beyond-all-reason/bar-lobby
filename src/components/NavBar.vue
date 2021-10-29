<template>
    <Panel :style="'border-left: none; border-top: none; border-right: none;'">
        <div class="nav">
            <div class="left">
                <button class="item logo">
                    <img src="@/assets/images/logo.svg">
                </button>
                <button class="item">Campaign</button>
                <button class="item">Missions</button>
                <button class="item">Versus</button>
                <button class="item">Replays</button>
            </div>
            <div class="right">
                <button class="item">
                    Jazcash
                </button>
                <button class="item icon">
                    <Icon icon="cog" :size="40" />
                </button>
                <button class="item icon">
                    <Icon icon="close-thick" :size="40" />
                </button>
            </div>
        </div>
    </Panel>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
});
</script>

<style scoped lang="scss">
.background {
    position: absolute;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.4);
    z-index: -1;
    backdrop-filter: blur(7px);
    &:after {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        content: "";
        background: url("~@/assets/images/px_by_Gre3g.png");
        filter: brightness(70%);
        opacity: 0.25;
    }
}
.nav {
    display: flex;
    justify-content: space-between;
}
.left, .right {
    display: flex;
    gap: 1px;
}
.item {
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
    &:hover {
        background: radial-gradient(rgba(0, 0, 0, 0), rgba(255, 255, 255, 0.12));
        color: #fff;
        text-shadow: 0 0 7px #fff;
    }
    &.icon {
        padding: 10px 15px;
    }
}
.logo {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-shrink: 0;
    img {
        height: 40px;
        opacity: 0.9;
    }
    &:hover img {
        opacity: 1;
    }
}
</style>
