<template>
    <div class="flex-row flex-center-items">
        <Textbox
            class="title-textbox"
            :class="{ 'control-not-editable': !editing }"
            :value="battleStore.title"
            :readonly="!editing || !battleStore.isOnline"
            :style="{ width: titleLength + 'ch' }"
            @keyup.enter="handleEnter"
        />
        <div v-if="!editing && battleStore.isOnline" class="flex-col flex-center edit-title" @click="setEditing">
            <Icon :icon="squareEditOutline" height="23" />
        </div>
    </div>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import squareEditOutline from "@iconify-icons/mdi/square-edit-outline";
import { computed } from "vue";
import { ref } from "vue";

import Textbox from "@renderer/components/controls/Textbox.vue";
import { battleStore } from "@renderer/store/battle.store";

const titleLength = computed(() => battleStore.title.length);
const editing = ref(false);

function setEditing() {
    editing.value = true;
}

function handleEnter() {
    // api.comms.request("c.lobby.message", {
    //     message: `$rename ${event.target.value}`,
    // });
    editing.value = false;
}
</script>

<style lang="scss" scoped>
.control-not-editable.control {
    background: none !important;
    border: 0px;
}
.title-textbox {
    font-size: 48px;
    max-height: unset;
}
</style>
