<template>
    <div v-if="layout === 'tiles'" class="battle-list__item" @click="joinBattle">
        <div class="battle-list__background" :style="`background-image: url('${mapImageUrl}')`" />
        <div class="battle-list__header">
            <div class="battle-list__title">
                <div>
                    <Flag :country-code="founder.countryCode" />
                </div>
                <div>
                    <Icon v-if="battle.locked || battle.passworded" icon="lock" />
                </div>
                <div>
                    {{ battle.title }}
                </div>
            </div>
            <div>
                Preset (TODO)
            </div>
        </div>
        <div class="battle-list__header battle-list__meta">
            <div>
                {{ mapName }}
            </div>
            <div>
                {{ runtime }}
            </div>
        </div>
        <div class="battle-list__clients battle-list__clients--players">
            <div v-for="player in players" :key="player.userId" class="battle-list__client">
                <div v-if="player.countryCode">
                    <Flag :country-code="player.countryCode" />
                </div>
                <div>
                    {{ player.username }}
                </div>
            </div>
            <div v-for="(bot, i) in battle.botNames" :key="i" class="battle-list__client">
                <div>
                    <Icon icon="robot" />
                </div>
                <div>
                    {{ bot }}
                </div>
            </div>
        </div>
        <div v-if="spectators.length" class="battle-list__clients battle-list__clients--spectators">
            <div v-for="spectator in spectators" :key="spectator.userId" class="battle-list__client">
                <div v-if="spectator.countryCode">
                    <Flag :country-code="spectator.countryCode" />
                </div>
                <div>
                    {{ spectator.username }}
                </div>
            </div>
        </div>
    </div>
    <div v-else class="battle-list__item">
        <div>
            <div class="flex-center fullheight">
                <Flag :country-code="founder.countryCode" />
            </div>
        </div>
        <div>
            <div class="flex-center fullheight">
                <Icon v-if="battle.locked || battle.passworded" icon="lock" />
            </div>
        </div>
        <div>
            {{ battle.title }}
        </div>
        <div>
            TODO
        </div>
        <div>
            {{ battle.mapName }}
        </div>
        <div>
            <div class="flex-row gap-md">
                <div class="flex-row gap-sm">
                    <img src="@/assets/images/icons/com.png" style="height: 23px;">
                    <div style="width: 2ch">
                        {{ players.length }}
                    </div>
                </div>
                <div class="flex-row gap-sm">
                    <Icon icon="robot" />
                    <div style="width: 2ch">
                        {{ battle.botNames.length }}
                    </div>
                </div>
                <div class="flex-row gap-sm">
                    <Icon icon="eye-outline" />
                    <div style="width: 2ch">
                        {{ spectators.length }}
                    </div>
                </div>
            </div>
        </div>
        <div>
            {{ runtime }}
        </div>
    </div>
</template>

<script lang="ts" setup>
import type { BattlePreviewType } from "@/model/battle/battle-preview";
import { computed } from "vue";
import Flag from "@/components/misc/Flag.vue";
import { useNow } from "@vueuse/core";
import Icon from "@/components/common/Icon.vue";

const props = defineProps<{
    battle: BattlePreviewType,
    layout: "tiles" | "rows"
}>();

const users = computed(() => props.battle.userIds.map(id => api.session.getUserById(id)!));
const players = computed(() => users.value.filter(user => !user.battleStatus?.spectator));
const spectators = computed(() => users.value.filter(user => user?.battleStatus?.spectator));
const founder = computed(() => api.session.getUserById(props.battle.founderId)!);
const map = computed(() => api.content.maps.getMapByScriptName(props.battle.mapName));
const mapImageUrl = computed(() => map.value ? `file://${map.value.textureImagePath}` : require("@/assets/images/default-minimap.png"));
const mapName = computed(() => map.value ? map.value.friendlyName : api.content.maps.scriptNameToFriendlyName(props.battle.mapName));
const runtime = computed(() => {
    if (!props.battle.startTime) {
        return null;
    }
    const ms = useNow({ interval: 1000 }).value.getTime() - props.battle.startTime.getTime();
    const runtimeDate = new Date(ms);
    const hours = (runtimeDate.getHours() - 1).toString().padStart(2, "0");
    const minutes = runtimeDate.getMinutes().toString().padStart(2, "0");
    const seconds = runtimeDate.getSeconds().toString().padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
});

const joinBattle = () => {
    console.log(props.battle.id);
};
</script>