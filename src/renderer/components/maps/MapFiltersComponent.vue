<template>
    <div class="fullheight scroll-container">
        <div class="flex-col gap-xl filters">
            <div>
                <h6>Max Players</h6>
                <MaxPlayersFilter />
            </div>
            <div>
                <h6>Terrain</h6>
                <TerrainFilter />
            </div>
            <div>
                <h6>Game Type</h6>
                <GameTypeFilter />
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
/**
 * Sort by:
 * - name
 * - size
 * - ideal max player count
 * - downloaded
 * - date created or updated
 *
 * Filter by:
 * - name (text search)
 * - map size (min and max, as slider)
 * - max players (min and max, as slider)
 * - game type
 * - terrain (general, water type, & layout)
 */
import GameTypeFilter from "@renderer/components/maps/filters/GameTypeFilter.vue";
import MaxPlayersFilter from "@renderer/components/maps/filters/MaxPlayersFilter.vue";
import TerrainFilter from "@renderer/components/maps/filters/TerrainFilter.vue";
</script>

<style lang="scss" scoped>
.filters {
    padding-right: 10px;
}
</style>
