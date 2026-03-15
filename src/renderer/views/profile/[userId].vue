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
                <!--<img ref="logo" class="avatar" src="/src/renderer/assets/images/BARLogoFull.png" />-->
                <div class="profile-user-info">
                    <h2 class="flex-row gap-lg">
                        <Flag :countryCode="user.countryCode" style="width: 50px" />
                        {{ user.displayName }}
                        <span v-if="'isMe' in user && user.isMe === 1" class="my-profile-note"
                            >[{{ t("lobby.views.profile.myProfile") }}]</span
                        >
                    </h2>
                    <dl class="profile-info">
                        <dt>{{ t("lobby.views.profile.userId") }}:</dt>
                        <dd>{{ user.userId }}</dd>

                        <dt>{{ t("lobby.views.profile.status") }}:</dt>
                        <dd>
                            <span class="status-dot" :class="`status-dot--${user.status}`"></span>
                            {{
                                user.status === "offline"
                                    ? t("lobby.views.profile.statusOffline")
                                    : user.status === "menu"
                                      ? t("lobby.views.profile.statusMenu")
                                      : user.status === "playing"
                                        ? t("lobby.views.profile.statusPlaying")
                                        : t("lobby.views.profile.statusLobby")
                            }}
                        </dd>

                        <dt>{{ t("lobby.views.profile.clan") }}:</dt>
                        <dd>
                            <template v-if="user.clanBaseData"> [{{ user.clanBaseData.tag }}] {{ user.clanBaseData.name }} </template>
                            <template v-else-if="'isMe' in user && user.isMe === 1">
                                <RouterLink to="/profile/clan-directory">
                                    <button class="btn-find-clan">{{ t("lobby.views.profile.findAClan") }}</button>
                                </RouterLink>
                            </template>
                            <template v-else>—</template>
                        </dd>
                        <dt>{{ t("lobby.views.profile.roles") }}:</dt>
                        <dd>{{ formatRoles(user.roles) }}</dd>
                        <dt>{{ t("lobby.views.profile.rating") }}:</dt>
                        <dd>{{ user.rating?.value ?? "—" }}</dd>
                    </dl>
                </div>
            </div>
        </Panel>
        <Panel class="profile-container" v-else>
            <p>{{ t("lobby.views.profile.userNotFound") }}</p>
        </Panel>
    </div>
</template>

<script lang="ts" setup>
import Flag from "@renderer/components/misc/Flag.vue";
import Panel from "@renderer/components/common/Panel.vue";
import { useDexieLiveQueryWithDeps } from "@renderer/composables/useDexieLiveQuery";
import { db } from "@renderer/store/db";
import { useTypedI18n } from "@renderer/i18n";
import { fetchUserInfo } from "@renderer/store/users.store";
const { t } = useTypedI18n();

const roleTranslationKeys: Record<string, string> = {
    contributor: "lobby.views.profile.roleContributor",
    admin: "lobby.views.profile.roleAdmin",
    moderator: "lobby.views.profile.roleModerator",
    tournament_winner: "lobby.views.profile.roleTournamentWinner",
    tournament_caster: "lobby.views.profile.roleTournamentCaster",
};

function formatRoles(roles: string[] | undefined) {
    if (!roles?.length) return "—";

    return roles
        .map((role) => {
            if (role in roleTranslationKeys) {
                return t(roleTranslationKeys[role]);
            }
            return role;
        })
        .join(", ");
}

const props = defineProps<{
    userId: string;
}>();

const user = useDexieLiveQueryWithDeps([() => props.userId], async () => {
    const retval = await db.users.get(props.userId);

    if (!retval || retval.displayName === "Unknown User") {
        return await fetchUserInfo(props.userId);
    }

    return retval;
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

.profile-info {
    display: grid;
    grid-template-columns: max-content 1fr;
    column-gap: 12px;
    row-gap: 4px;
    margin: 0;

    dt {
        color: rgba(255, 255, 255, 0.5);
        white-space: nowrap;
    }

    dd {
        margin: 0;
        display: flex;
        align-items: center;
    }
}
.my-profile-note {
    color: rgba(255, 255, 255, 0.5);
}

.status-dot {
    display: inline-block;
    width: 12px;
    height: 12px;
    margin-right: 3px;
    border-radius: 50%;
    vertical-align: middle;
    position: relative;
    top: -1px;
    box-sizing: border-box;
}

.status-dot--offline {
    background-color: #8d8d8d;
}

.status-dot--menu {
    border: 2px solid #48c774;
    background-color: transparent;
}

.status-dot--lobby {
    background-color: #48c774;
}

.status-dot--playing {
    background-color: #f1c40f;
}
.btn-find-clan {
    align-self: center;
    font-family: Rajdhani;
    font-weight: bold;
    font-size: 1rem;
    padding: 3px 20px;
    border: none;
    border-radius: 2px;
    text-align: center;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition:
        transform 0.3s ease,
        box-shadow 0.3s ease;
}
.btn-find-clan {
    color: #fff;
    background: linear-gradient(90deg, #22c55e, #16a34a);
    box-shadow: 0 0 15px rgba(34, 197, 94, 0.4);
}
.btn-find-clan:hover {
    box-shadow: 0 0 25px rgba(34, 197, 94, 0.6);
}
</style>
