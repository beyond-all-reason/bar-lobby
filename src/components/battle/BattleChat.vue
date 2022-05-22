<template>
    <div class="battle-chat">
        <div class="messages">
            <div v-for="(message, i) in messages" :key="i" class="message">
                <div v-if="message.type === 'chat'" class="author">
                    {{ message.usedId }}
                </div>
                <div class="text">
                    {{ message.text }}
                </div>
            </div>
        </div>
        <Textbox v-model="myMessage" class="textbox fullwidth" enableSubmit enableHistory @submit="sendMessage" />
    </div>
</template>

<script lang="ts" setup>
import { onUnmounted, reactive, ref } from "vue";

import Textbox from "@/components/inputs/Textbox.vue";
import { BattleChatMessage } from "@/model/battle/battle-chat";

const messages: BattleChatMessage[] = reactive([]);
const myMessage = ref("");

messages[0] = { type: "system", text: "Welcome!" };
messages[1] = { type: "chat", usedId: 1234, text: "Test" };
messages[2] = { type: "chat", usedId: 12344, text: "Testdssdad asd asdasd ad ad adad ad asd" };
messages[3] = { type: "chat", usedId: 223, text: "Testdssdad asd asdasd ad ad adad ad asd Testdssdad asd asdasd ad ad adad ad asd Testdssdad asd asdasd ad ad adad ad asd" };
messages[4] = { type: "chat", usedId: 223, text: "Testdssdad asd asdasd ad ad adad ad asd Testdssdad asd asdasd ad ad adad ad asd Testdssdad asd asdasd ad ad adad ad asd" };
messages[5] = { type: "chat", usedId: 223, text: "Testdssdad asd asdasd ad ad adad ad asd Testdssdad asd asdasd ad ad adad ad asd Testdssdad asd asdasd ad ad adad ad asd" };
messages[6] = { type: "chat", usedId: 223, text: "Testdssdad asd asdasd ad ad adad ad asd Testdssdad asd asdasd ad ad adad ad asd Testdssdad asd asdasd ad ad adad ad asd" };

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
}
.messages {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    height: 236px;
    padding: 15px;
    overflow-y: scroll;
    user-select: text;
    * {
        user-select: text;
    }
}
.message {
    flex-direction: row;
}
.author {
    font-weight: 600;
    flex-direction: row;
    &:after {
        content: ":";
        margin-right: 5px;
    }
}
.textbox {
    :deep(input) {
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.1);
    }
}
</style>
