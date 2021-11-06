<template>
    <div>
        <Background :src="require('@/assets/images/bg1.jpg')" />
        <NavBar />
        <div class="main">
            <router-view/>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
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
