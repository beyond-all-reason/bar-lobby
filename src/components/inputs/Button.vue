<template>
    <Tooltip :content="tooltip">
        <component :is="to ? 'router-link' : 'button'" class="btn" @mouseenter="sound" :to="to" :class="{ active: isActive }" v-bind="$attrs">
            <div class="content">
                <slot />
            </div>
        </component>
    </Tooltip>
</template>

<script lang="ts" setup>
import { computed, toRefs } from "vue";
import { useRoute } from "vue-router";
import Tooltip from "@/components/common/Tooltip.vue";

const props = defineProps<{
    to?: string;
    tooltip?: string;
}>();

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