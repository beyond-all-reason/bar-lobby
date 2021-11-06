<template>
    <suspense>
        <DebugSidebar/>
    </suspense>
    <router-view/>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useRouter } from "vue-router";

export default defineComponent({
    setup() {
        const router = useRouter();
        router.replace("/");

        return {};
    }
});
</script>