<template>
    <div class="server-info">
        <div class="server-info__players">
            69 Players Online
        </div>
        <div class="server-info__status">
            ⬤
        </div>
    </div>
</template>

<script lang="ts" setup>
</script>

<style lang="scss" scoped>
.server-info {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    gap: 7px;
    padding: 0 10px;
    &__players {
        //font-size: 16px;
    }
    &__status {
        font-size: 12px;
        color: rgb(121, 226, 0);
    }
}
</style>