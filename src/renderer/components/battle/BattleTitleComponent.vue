<template>
    <div class="flex-row flex-center-items">
        <Textbox
            class="title-textbox"
            :class="{ 'control-not-editable': !editing }"
            :value="battle.battleOptions.title"
            :readonly="!editing"
            :style="{ width: titleLength + 'ch' }"
            @keyup.enter="(event) => handleEnter(event)"
        />
        <div v-if="isSpadsBattle(battle) && !editing" class="flex-col flex-center edit-title" @click="setEditiong">
            <Icon :icon="squareEditOutline" height="23" />
        </div>
    </div>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import squareEditOutline from "@iconify-icons/mdi/square-edit-outline";
import { computed } from "@vue/reactivity";
import { ref } from "vue";

import Textbox from "@/components/controls/Textbox.vue";
import { AbstractBattle } from "@/model/battle/abstract-battle";
import { CurrentUser } from "@/model/user";
import { isSpadsBattle } from "@/utils/type-checkers";

const props = defineProps<{
    battle: AbstractBattle;
    me: CurrentUser;
}>();
const titleLength = computed(() => props.battle.battleOptions.title.length);

const editing = ref(false);

function setEditiong() {
    editing.value = true;
}

function handleEnter(event) {
    api.comms.request("c.lobby.message", {
        message: `$rename ${event.target.value}`,
    });
    editing.value = false;
    event.stopPropagation();
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
