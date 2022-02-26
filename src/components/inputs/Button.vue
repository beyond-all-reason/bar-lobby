<template>
    <router-link v-if="to" @mouseenter="sound" :to="to" class="btn" :class="{ active: isActive }">
        <div class="content">
            <slot />
        </div>
    </router-link>
    <button v-else class="btn" @mouseenter="sound">
        <div class="content">
            <slot />
        </div>
    </button>
</template>

<script lang="ts" setup>
import { computed, toRefs } from "vue";
import { useRoute } from "vue-router";

const props = defineProps({
    to: String
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