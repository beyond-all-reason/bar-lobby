<template>
    <div class="battle-chat">
        <div class="battle-chat__log">
            Message
        </div>
        <div class="battle-chat__textbox">
            <Textbox v-model="currentMessage" class="fullwidth" enableSubmit enableHistory @submit="sendMessage" />
        </div>
    </div>
</template>

<script lang="ts" setup>
import Textbox from "@/components/inputs/Textbox.vue";
import { ref } from "vue";

const currentMessage = ref("");

const sendMessage = (message: string) => {
    console.log(message);
};
</script>