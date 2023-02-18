<template>
    <PopOutPanel :open="open">
        <TabView class="messages-tabview">
            <TabPanel header="Test">
                <div class="messages">
                    <div class="message">I am a message</div>
                    <div class="message">Hello world</div>
                    <div class="message">
                        Lorem ipsum dolor sit amet consectetur adipisicing elit. Quidem, porro. Earum, inventore itaque ullam incidunt
                        praesentium porro non dolor nisi autem eos voluptatem molestias atque, fugiat quo impedit id rem? Lorem ipsum dolor
                        sit amet consectetur adipisicing elit. Quidem, porro. Earum, inventore itaque ullam incidunt praesentium porro non
                        dolor nisi autem eos voluptatem molestias atque, fugiat quo impedit id rem? Lorem ipsum dolor sit amet consectetur
                        adipisicing elit. Quidem, porro. Earum, inventore itaque ullam incidunt praesentium porro non dolor nisi autem eos
                        voluptatem molestias atque, fugiat quo impedit id rem? Lorem ipsum dolor sit amet consectetur adipisicing elit.
                        Quidem, porro. Earum, inventore itaque ullam incidunt praesentium porro non dolor nisi autem eos voluptatem
                        molestias atque, fugiat quo impedit id rem? Lorem ipsum dolor sit amet consectetur adipisicing elit. Quidem, porro.
                        Earum, inventore itaque ullam incidunt praesentium porro non dolor nisi autem eos voluptatem molestias atque, fugiat
                        quo impedit id rem?
                    </div>
                </div>
            </TabPanel>
            <TabPanel header="Test2">
                <div class="messages">
                    <div class="message">I am a message</div>
                    <div class="message">Hello world</div>
                    <div class="message">
                        Lorem ipsum dolor sit amet consectetur adipisicing elit. Quidem, porro. Earum, inventore itaque ullam incidunt
                        praesentium porro non dolor nisi autem eos voluptatem molestias atque, fugiat quo impedit id rem? Lorem ipsum dolor
                        sit amet consectetur adipisicing elit. Quidem, porro. Earum, inventore itaque ullam incidunt praesentium porro non
                        dolor nisi autem eos voluptatem molestias atque, fugiat quo impedit id rem? Lorem ipsum dolor sit amet consectetur
                        adipisicing elit. Quidem, porro. Earum, inventore itaque ullam incidunt praesentium porro non dolor nisi autem eos
                        voluptatem molestias atque, fugiat quo impedit id rem? Lorem ipsum dolor sit amet consectetur adipisicing elit.
                        Quidem, porro. Earum, inventore itaque ullam incidunt praesentium porro non dolor nisi autem eos voluptatem
                        molestias atque, fugiat quo impedit id rem? Lorem ipsum dolor sit amet consectetur adipisicing elit. Quidem, porro.
                        Earum, inventore itaque ullam incidunt praesentium porro non dolor nisi autem eos voluptatem molestias atque, fugiat
                        quo impedit id rem?
                    </div>
                </div>
            </TabPanel>
            <TabPanel header="Test3">
                <div class="messages">
                    <div class="message">I am a message</div>
                    <div class="message">Hello world</div>
                    <div class="message">
                        Lorem ipsum dolor sit amet consectetur adipisicing elit. Quidem, porro. Earum, inventore itaque ullam incidunt
                        praesentium porro non dolor nisi autem eos voluptatem molestias atque, fugiat quo impedit id rem? Lorem ipsum dolor
                        sit amet consectetur adipisicing elit. Quidem, porro. Earum, inventore itaque ullam incidunt praesentium porro non
                        dolor nisi autem eos voluptatem molestias atque, fugiat quo impedit id rem? Lorem ipsum dolor sit amet consectetur
                        adipisicing elit. Quidem, porro. Earum, inventore itaque ullam incidunt praesentium porro non dolor nisi autem eos
                        voluptatem molestias atque, fugiat quo impedit id rem? Lorem ipsum dolor sit amet consectetur adipisicing elit.
                        Quidem, porro. Earum, inventore itaque ullam incidunt praesentium porro non dolor nisi autem eos voluptatem
                        molestias atque, fugiat quo impedit id rem? Lorem ipsum dolor sit amet consectetur adipisicing elit. Quidem, porro.
                        Earum, inventore itaque ullam incidunt praesentium porro non dolor nisi autem eos voluptatem molestias atque, fugiat
                        quo impedit id rem?
                    </div>
                </div>
            </TabPanel>
        </TabView>
    </PopOutPanel>
</template>

<script lang="ts" setup>
import TabPanel from "primevue/tabpanel";

import TabView from "@/components/common/TabView.vue";
import PopOutPanel from "@/components/navbar/PopOutPanel.vue";

const props = defineProps<{
    open: boolean;
}>();
</script>

<style lang="scss" scoped>
.messages-tabview,
:deep(.p-tabview-panels),
:deep(.p-tabview-panel) {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
}
.messages {
    display: flex;
    flex-direction: column;
    overflow-y: scroll;
    padding: 10px;
    gap: 5px;
    flex: 1 1 auto;
    height: 100%;
}
.message {
    width: 100%;
    word-break: break-word;
    padding: 4px 8px;
    user-select: text;
    display: flex;
    flex-direction: row;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 3px;
}
</style>
