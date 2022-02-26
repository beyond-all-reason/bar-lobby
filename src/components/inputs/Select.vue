<template>
    <div class="control select" @mouseenter="sound">
        <label :for="uuid" v-if="label">{{ label }}</label>
        <VueNextSelect :name="uuid" :hide-selected="true" v-bind="$attrs"></VueNextSelect>
    </div>
</template>

<script lang="ts" setup>
// https://iendeavor.github.io/vue-next-select/api-reference.html

import VueNextSelect from "vue-next-select";
import { ref, defineProps } from "vue";
import { v4 as uuidv4 } from "uuid";

type VueNextSelectProps = InstanceType<typeof VueNextSelect>["$props"];

interface Props extends VueNextSelectProps {
    label?: string;
}

const props = defineProps<Props>();

const uuid = ref(uuidv4());
const label = ref(props.label);

const sound = () => window.api.audio.getSound("button-hover").play();
</script>

