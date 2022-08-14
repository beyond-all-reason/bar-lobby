<route lang="json">
{ "meta": { "title": "Inputs", "order": 1 } }
</route>

<template>
    <div class="controls">
        <Checkbox v-model="disabled" label="Controls disabled" />
        <Textbox v-model="txt" label="Text" placeholder="text" :disabled="disabled" />
        <Textbox v-model="test" label="bob" placeholder="test" :disabled="disabled" />
        <Checkbox v-model="check" label="Checkbox" :disabled="disabled" />
        <Button :disabled="disabled"> I am a button </Button>
        <div class="test">
            <Select v-model="color" :options="['blue', 'red', 'green', 'fish', 'yep']" :disabled="disabled" />
        </div>
        <Options v-model="option" label="Options" :disabled="disabled" fullWidth>
            <Option value="option1"> Option 1 </Option>
            <Option value="option2"> Option 2 </Option>
            <Option value="option3"> Option 3 </Option>
        </Options>
    </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";

import Button from "@/components/inputs/Button.vue";
import Checkbox from "@/components/inputs/Checkbox.vue";
import Option from "@/components/inputs/Option.vue";
import Options from "@/components/inputs/Options.vue";
import Select from "@/components/inputs/Select.vue";
import Textbox from "@/components/inputs/Textbox.vue";

const test = ref("fish");
const color = ref("red");
const disabled = ref(false);
const txt = ref("");
const check = ref(true);
const option = ref(["option1"]);
</script>

<style lang="scss" scoped>
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
