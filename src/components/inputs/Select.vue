<template>
    <div class="control select">
        <label :for="uuid" v-if="label">{{ label }}</label>
        <vue-select :name="uuid" :hide-selected="true" v-bind="$attrs"></vue-select>
    </div>
</template>

<script lang="ts" setup>
// https://iendeavor.github.io/vue-next-select/

import { ref } from "vue";
import { v4 as uuidv4 } from "uuid";

const props = defineProps({
    label: String
});

const uuid = ref(uuidv4());
const label = ref(props.label);
</script>

