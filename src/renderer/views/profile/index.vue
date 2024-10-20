<route lang="json5">
{
    meta: {
        title: "Profile",
        devOnly: true,
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
import { useRouter } from "vue-router";

const myUserId = api.session.onlineUser.userId;

const router = useRouter();
await router.push(`/profile/${myUserId}`);
</script>

<style lang="scss" scoped></style>
