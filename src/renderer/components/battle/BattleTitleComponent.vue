<template>
    <div class="flex-row flex-center-items">
        <Textbox
            class="title-textbox"
            :class="{ 'control-not-editable': !editing }"
            :value="battleStore.title"
            :readonly="!editing || !battleStore.isOnline"
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
import { ref } from "vue";

import Textbox from "@renderer/components/controls/Textbox.vue";
import { battleStore } from "@renderer/store/battle.store";

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
    width: 100%;
    font-size: 36px;
    font-weight: bold;
    text-transform: uppercase;
    filter: drop-shadow(0 0 5px rgba(0, 0, 0, 0.9));
    max-height: unset;
}
</style>
