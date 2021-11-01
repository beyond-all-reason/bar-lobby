<template>
    <router-view/>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
    setup() {
        return {};
    },
    beforeCreate() {
        this.$router.replace("/");
    }
});
</script>