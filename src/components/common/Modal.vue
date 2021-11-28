<template>
    <teleport to="#view">
        <div class="modal-container">
            <Panel id="modal" class="modal">
                <slot/>
            </Panel>
        </div>
    </teleport>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
    setup() {
        return {};
    }
});
</script>

<style scoped lang="scss">
</style>