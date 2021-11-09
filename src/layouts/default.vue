<template>
    <div class="fullsize">
        <Background :src="require('@/assets/images/bg1.jpg')" />
        <div class="container">
            <NavBar />
            <router-view v-slot="{ Component }">
                <transition :name="transition" :appear="Boolean(transition)">
                    <div class="content">
                        <component :is="Component" />
                    </div>
                </transition>
            </router-view>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
    props: {
        transition: {
            type: String,
            default: ""
        }
    },
    setup() {
        return {};
    }
});
</script>

<style lang="scss" scoped>
.container {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    max-height: 100%;
}
.main {
    padding: 10px;
    flex-grow: 1;
    height: 0;
}
.content {
    padding: 10px;
    overflow-y: hidden;
}
</style>
