<route lang="json5">
{
    meta: {
        title: "Profile",
        transition: {
            name: "slide-below",
        },
    },
}
</route>

<template>
    <div></div>
</template>

<script lang="ts" setup>
const myUserId = api.session.onlineUser.userId;

await api.router.push(`/profile/${myUserId}`);
</script>

<style lang="scss" scoped></style>
