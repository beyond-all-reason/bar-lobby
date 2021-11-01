<template>
    <div>
        <div class="hover" v-for="(n, i) in 20" :key="i">Hello world</div>
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

<style scoped lang="scss">
.hover {
    background: red;
    &:hover {
        background: blue;
    }
}
</style>