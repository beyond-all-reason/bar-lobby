<template>
    <Panel class="friends" :class="{ hidden: !open }">
        <TabView ref="tabViewEl" v-model:activeIndex="activeIndex">
            <TabPanel header="Friends">
                <div class="flex-row gap-md">
                    <Textbox class="txtFriendId" label="Friend ID" />
                    <Button class="blue">Add Friend</Button>
                </div>
            </TabPanel>
            <TabPanel header="Pending"> World </TabPanel>
            <TabPanel header="Blocked"> Test 2</TabPanel>
            <template #header>
                <li class="p-tabview-header close" @click="onClose">
                    <div class="p-tabview-nav-link p-tabview-header-action">
                        <Icon :icon="closeThick" />
                    </div>
                </li>
            </template>
        </TabView>
    </Panel>
</template>

<script lang="ts" setup>
/**
 * TODO:
 * list friends (online above, offline below)
 * friend shows: username, flag, ingame status (playing 4v4 on DSD / watching 4v4 on DSD / waiting for game to begin / watch)
 * add friend button
 * remove friend button
 * invite to battle button
 */

import { Icon } from "@iconify/vue";
import closeThick from "@iconify-icons/mdi/close-thick";
import { ref, watch } from "vue";

import Panel from "@/components/common/Panel.vue";
import TabPanel from "@/components/common/TabPanel.vue";
import TabView from "@/components/common/TabView.vue";
import Button from "@/components/controls/Button.vue";
import Textbox from "@/components/controls/Textbox.vue";

const props = defineProps<{
    open: boolean;
}>();

const emits = defineEmits<{
    (event: "update:open", open: boolean): void;
}>();

const activeIndex = ref(0);

watch(
    () => props.open,
    (open: boolean) => {
        if (open) {
            activeIndex.value = 0;
        }
    }
);

const onClose = () => {
    emits("update:open", false);
};
</script>

<style lang="scss" scoped>
.friends {
    position: absolute;
    right: 9px;
    top: 70px;
    z-index: 1;
    min-width: 400px;
    transform: translateX(0);
    opacity: 1;
    transition: transform 200ms, opacity 200ms;
    &.hidden {
        transform: translateX(20px);
        opacity: 0;
    }
    :deep(.content) {
        padding: 0;
    }
}
:deep(.p-tabview) {
    .p-tabview-nav {
        flex-direction: row;
        background: rgba(0, 0, 0, 0.1);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .p-tabview-nav-link {
        padding: 10px;
        color: rgba(255, 255, 255, 0.4);
        &:hover {
            color: #fff;
        }
    }
    .p-tabview-header {
        width: 100%;
        display: flex;
        justify-content: center;
        box-shadow: inset -1px 0 0 0 rgba(255, 255, 255, 0.1);
        .p-tabview-nav-link {
            width: 100%;
            display: flex;
            justify-content: center;
        }
        &.close {
            width: unset;
            box-shadow: unset;
        }
    }
    .p-highlight .p-tabview-nav-link {
        color: #fff;
        background: rgba(255, 255, 255, 0.05);
    }
    .p-tabview-panel {
        padding: 10px;
    }
}
:deep(.txtFriendId) {
    background: blue;
}
</style>
