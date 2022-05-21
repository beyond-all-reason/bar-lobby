<template>
    <div class="battle-chat">
        <div class="battle-chat__log">
            <div v-for="(message, i) in messages" :key="i" class="battle-chat__message">
                <div v-if="message.type === 'chat'" class="battle-chat__message-author">
                    {{ message.usedId }}
                </div>
                <div class="battle-chat__message-text">
                    {{ message.text }}
                </div>
            </div>
        </div>
        <div class="battle-chat__textbox">
            <Textbox v-model="myMessage" class="fullwidth" enableSubmit enableHistory @submit="sendMessage" />
        </div>
    </div>
</template>

<script lang="ts" setup>
import Textbox from "@/components/inputs/Textbox.vue";
import { BattleChatMessage } from "@/model/battle/battle-chat";
import { onUnmounted, reactive, ref } from "vue";

const messages: BattleChatMessage[] = reactive([]);
const myMessage = ref("");

messages[0] = { type: "system", text: "Welcome!" };
messages[1] = { type: "chat", usedId: 1234, text: "Test" };
messages[2] = { type: "chat", usedId: 12344, text: "Testdssdad asd asdasd ad ad adad ad asd" };

const sendMessage = (message: string) => {
    console.log(message);
    //api.client.request("c.lobby.say", {  })
};

const onMessage = api.client.onResponse("s.lobby.say").add((data) => {
    console.log("message", data);
});

onUnmounted(() => {
    onMessage.destroy();
});
</script>

<style lang="scss" scoped>
.battle-chat {
    margin-top: auto;
    gap: 10px;
    &__log {
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.1);
        height: 236px;
        padding: 15px;
    }
    &__textbox {
        input {
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
    }
}
</style>