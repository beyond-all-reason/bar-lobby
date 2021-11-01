<template>
    <Background />
    <NavBar />
    <div class="main">
        <router-view/>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import NavBar from "@/components/NavBar.vue";
import Background from "@/components/Background.vue";

export default defineComponent({
    components: {
        Background,
        NavBar
    },
    setup() {
        return {};
    }
});
</script>

<style lang="scss" scoped>
.main {
    height: 100%;
    padding: 10px;
}
.hover {
    background: red;
    &:hover {
        background: blue;
    }
}
</style>
