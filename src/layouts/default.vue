<template>
    <div :class="`fullsize layout layout--default`">
        <NavBar />
        <div :class="`view view--${route.name?.toString()}`">
            <router-view v-slot="{ Component }">
                <transition :name="transition" mode="out-in">
                    <component :is="Component" />
                </transition>
            </router-view>
        </div>
        <div id="modal-container" class="modal-container">
            
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useRoute } from "vue-router";

export default defineComponent({
    props: {
        transition: {
            type: String,
            default: "slide"
        }
    },
    setup() {
        const route = useRoute();

        return { route };
    }
});
</script>

<style lang="scss" scoped>
.view {
    overflow-y: hidden;
    padding: 20px;
    display: flex;
    flex-direction: column;
    flex-grow: 1;
}
.modal-container {
    @extend .fullsize;
    z-index: 10;
    pointer-events: none;
}
</style>
