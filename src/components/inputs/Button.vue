<template>
    <Tooltip :content="tooltip">
        <div class="control button" :class="{ 'flex-grow': flexGrow }">
            <component :is="to ? 'router-link' : 'button'" class="btn" :to="to" :class="{ active: isActive }" v-bind="$attrs" @mouseenter="sound">
                <div class="content">
                    <slot />
                </div>
            </component>
        </div>
    </Tooltip>
</template>

<script lang="ts" setup>
import { computed, toRefs } from "vue";
import { useRoute } from "vue-router";
import Tooltip from "@/components/common/Tooltip.vue";

const props = withDefaults(defineProps<{
    to?: string;
    tooltip?: string;
    disabled?: boolean;
    flexGrow?: boolean;
}>(), {
    to: undefined,
    tooltip: undefined,
    disabled: false,
    flexGrow: true
});

const route = useRoute();
const to = toRefs(props).to;
const isActive = computed(() => props.to && route.path.includes(props.to));
const sound = () => {
    if (!props.to || (props.to && !isActive.value)) {
        window.api.audio.getSound("button-hover").play();
    }
};
</script>

<style scoped lang="scss">
.content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}
</style>