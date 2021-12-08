<template>
    <div class="control select">
        <label :for="uuid" v-if="label">{{ label }}</label>
        <vue-select :name="uuid" :hide-selected="true" v-bind="$attrs"></vue-select>
    </div>
</template>

<script lang="ts">
// https://iendeavor.github.io/vue-next-select/

import { defineComponent, ref } from "vue";
import { v4 as uuidv4 } from "uuid";

export default defineComponent({
    props: {
        label: String,
    },
    setup(props) {
        const uuid = ref(uuidv4());
        const label = ref(props.label);

        return { uuid, label };
    }
});
</script>

