<template>
    <Tooltip :content="tooltip">
        <div class="control button" :class="{ disabled, 'flex-grow': flexGrow, slim }">
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
    slim?: boolean;
    fullWidth?: boolean;
}>(), {
    to: undefined,
    tooltip: undefined,
    disabled: false,
    flexGrow: true,
    slim: false,
    fullWidth: false
});

const route = useRoute();
const to = toRefs(props).to;
const isActive = computed(() => props.to && route.path.includes(props.to));
const sound = () => {
    if (!props.to || (props.to && !isActive.value)) {
        api.audio.getSound("button-hover").play();
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