<template>
    <Panel :style="'border-left: none; border-top: none; border-right: none;'">
        <div class="nav">
            <div class="left">
                <Button class="item logo" depress to="/home" >
                    <img src="@/assets/images/logo.svg">
                </Button>
                <Button class="item" depress>Campaign</Button>
                <Button class="item" depress>Missions</Button>
                <Button class="item" depress>Versus</Button>
                <Button class="item" depress>Replays</Button>
            </div>
            <div class="right">
                <Button class="item" depress>
                    Jazcash
                </Button>
                <Button class="item icon" depress>
                    <Icon icon="cog" :size="40" />
                </Button>
                <Button class="item icon" depress >
                    <Icon icon="wrench" :size="35" />
                </Button>
                <Button class="item icon" depress>
                    <Icon icon="close-thick" :size="40" />
                </Button>
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
    &:hover:not(.selected) {
        background: radial-gradient(rgba(0, 0, 0, 0), rgba(255, 255, 255, 0.12));
        color: #fff;
        text-shadow: 0 0 7px #fff;
        z-index: 1;
        .left & {
            box-shadow: 1px 0 0 rgba(255, 255, 255, 0.3), -1px 0 0 rgba(255, 255, 255, 0.2), 7px -3px 10px rgba(0, 0, 0, 0.5), -7px -3px 10px rgba(0, 0, 0, 0.5);
        }
        .right & {
            box-shadow: 1px 0 0 rgba(255, 255, 255, 0.2), -1px 0 0 rgba(255, 255, 255, 0.3), 7px -3px 10px rgba(0, 0, 0, 0.5), -7px -3px 10px rgba(0, 0, 0, 0.5);
        }
    }
    &:active:not(.selected) {
        background: linear-gradient(rgba(0, 0, 0, 0.4), rgba(202, 202, 202, 0.1));
        box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.7) !important;
        color: rgba(255, 255, 255, 0.4);
        text-shadow: none;
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
