<route lang="json5">
{ meta: { title: "Scenarios", order: 1, transition: { name: "slide-left" } } }
</route>

<template>
    <div class="flex-col fullheight">
        <h1>{{ route.meta.title }}</h1>

        <div class="flex-row gap-lg fullheight">
            <div class="test">
                <div class="scenarios">
                    <ScenarioTile v-for="(scenario, i) in scenarios" :key="i" :scenario="scenario" />
                </div>
            </div>
            <div class="scenario-preview">
                <Button @click="test">Test</Button>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import Button from "@/components/controls/Button.vue";
import ScenarioTile from "@/components/misc/ScenarioTile.vue";

const route = api.router.currentRoute.value;
const scenarios = await api.content.game.getScenarios();

function test() {
    // const battle = new OfflineBattle({
    //     battleOptions: {
    //         engineVersion: ""
    //     }
    // });
    // api.game.launch(battle);
}
</script>

<style lang="scss" scoped>
.scenarios {
    width: 100%;
    display: grid;
    grid-gap: 15px;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
}
.scenario-preview {
    width: 250px;
    background: blue;
}
</style>
