<template>
    <Modal ref="modal" title="Sync Data Directories">
        <div class="container flex-col gap-md">
            <p>
                This tool let's you synchronise multiple data directories if you use multiple lobby applications. Select the data directory
                for the other lobby application below, then check the content you wish to synchronise. Files not from this lobby's data dir
                will be kept, and folders will be merged.
            </p>

            <div class="flex-row gap-md">
                Other Lobby's Data Dir: <input id="filepicker" type="file" name="fileList" webkitdirectory @change="test" />
            </div>

            <Button @click="stuff">Test</Button>
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import Modal from "@renderer/components/common/Modal.vue";
import Button from "@renderer/components/controls/Button.vue";

function test(evt) {
    console.log(evt);
}

async function stuff() {
    //
}
</script>

<style lang="scss" scoped>
.container {
    width: 700px;
}
</style>
