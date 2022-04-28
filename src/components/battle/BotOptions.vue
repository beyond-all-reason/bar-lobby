<template>
    <Modal name="configure-bot" :title="`Configure Bot ${bot.name} (${bot.aiShortName})`" width="700px">
        <div v-if="aiConfig && aiConfig.options" class="bot-options">
            <div v-for="aiOption of aiConfig.options" :key="aiOption.key" class="bot-options__option">
                <!-- <div class="bot-options__text flex-col">
                    <h4 v-if="aiOption.type === 'section'" class="bot-options__section">
                        {{ aiOption.name }}
                    </h4>
                    <h6 v-else class="bot-options__name">
                        {{ aiOption.name }}
                    </h6>
                    <p class="bot-options__description">
                        {{ aiOption.desc }}
                    </p>
                </div>
                <template v-if="ai">
                    <Checkbox v-if="aiOption.type === 'bool'" />
                </template> -->
            </div>
            <Button @click="configureBot">
                Apply
            </Button>
        </div>
        <div v-else>
            Couldn't find AI options for {{ bot.aiShortName }} for engine {{ battle.battleOptions.engineVersion }}
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import Modal from "@/components/common/Modal.vue";
import Button from "@/components/inputs/Button.vue";
import { Bot } from "@/model/battle/participants";
import { computed } from "vue";

const battle = api.battle;

const props = defineProps<{
    bot: Bot
}>();

const emit = defineEmits<{
    (event: "bot-configured", botConfig: unknown): void;
}>();

const aiConfig = computed(() => api.content.ai.getAi(battle.battleOptions.engineVersion, props.bot.aiShortName));

const configureBot = () => {
    emit("bot-configured", {});
    api.modals.close("configure-bot");
};
</script>