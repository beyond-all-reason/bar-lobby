<route lang="json">{ "meta": { "title": "Inputs", "order": 0 } }</route>

<template>
    <div class="controls">
        <Textbox v-model="txt" label="Text" placeholder="text" :disabled="disabled" />
        <Checkbox v-model="disabled" label="Controls disabled" />
        <Textbox v-model="test" label="bob" placeholder="test" :disabled="disabled" />
        <Button :disabled="disabled">
            I am a button
        </Button>
        <div class="test">
            <Select v-model="color" :options="['blue', 'red', 'green', 'fish', 'yep']" />
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import Select from "@/components/inputs/Select.vue";
import Textbox from "@/components/inputs/Textbox.vue";
import Checkbox from "@/components/inputs/Checkbox.vue";
import Button from "@/components/inputs/Button.vue";

const test = ref("fish");
const color = ref("red");
const disabled = ref(false);
const txt = ref("");
</script>

<style scoped lang="scss">
.controls {
    //position: relative;
    display: grid;
    grid-template-columns: 300px 300px;
    gap: 10px;
}
.test {
    height: 100px;
    //overflow: hidden;
    position: relative;
    padding-top: 10px;
    background: rgba(255, 0, 0, 0.1);
}
</style>