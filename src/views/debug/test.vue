<route lang="json">
{ "meta": { "title": "Test", "order": 2 } }
</route>

<template>
    <div>
        <Panel>
            <Tab v-for="(thing, i) in stuff" :key="i" :title="thing">
                {{ thing }}
            </Tab>
        </Panel>
    </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";

import Panel from "@/components/common/Panel.vue";
import Tab from "@/components/common/Tab.vue";

const stuff = ref(["one", "two", "three"]);
</script>

<style lang="scss" scoped></style>
