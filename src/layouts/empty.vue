<template>
    <transition :name="transition" :appear="Boolean(transition)">
        <router-view/>
    </transition>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
    props: {
        transition: {
            type: String,
            default: ""
        }
    },
    setup() {
        return {};
    }
});
</script>

<style scoped lang="scss">
.container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
}
</style>