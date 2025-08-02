<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<route lang="json5">
{ props: true, meta: { title: "Profile", hide: true, transition: { name: "slide-left" } } }
</route>
<template>
    <div class="view">
        <Panel class="profile-container" v-if="user">
            <div class="profile-header">
                <img ref="logo" class="avatar" src="/src/renderer/assets/images/BARLogoFull.png" />
                <div class="profile-user-info">
                    <h2 class="flex-row gap-lg">
                        <Flag :countryCode="user.countryCode" style="width: 50px" />
                        {{ user.displayName }}
                    </h2>
                    <p>Status: {{ user.status }}</p>
                    <p>Clan: {{ user.clanId }}</p>
                </div>
            </div>
        </Panel>
        <Panel class="profile-container" v-else>
            <p>User not found</p>
        </Panel>
    </div>
</template>

<script lang="ts" setup>
import Flag from "@renderer/components/misc/Flag.vue";
import Panel from "@renderer/components/common/Panel.vue";
import { useDexieLiveQueryWithDeps } from "@renderer/composables/useDexieLiveQuery";
import { db } from "@renderer/store/db";

const props = defineProps<{
    userId: string;
}>();

const user = useDexieLiveQueryWithDeps([() => props.userId], () => {
    return db.users.get(props.userId);
});
</script>

<style lang="scss" scoped>
.profile-container {
    display: flex;
    height: 100%;
    width: 1600px;
    align-self: center;
}

.profile-header {
    display: flex;
    align-items: center;
    margin-bottom: 15px;
    margin-top: 25px;
    div {
        margin-right: auto;
    }
}

.avatar {
    width: 184px;
    height: 184px;
    border-radius: 1%;
    margin-right: 20px;
    border: 1px solid #5e5757;
    backdrop-filter: blur(2px);
}

.profile-user-info {
    display: flex;
    flex-direction: column;
    gap: 3px;
}
</style>
