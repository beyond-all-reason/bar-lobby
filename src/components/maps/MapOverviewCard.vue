<template>
    <div class="map-preview" @click="mapSelected">
        <div class="background" :style="`background-image: url('${mapImageUrl}')`" />
        <div class="header">
            <div class="title">
                <div class="flex-row flex-center gap-sm">
                    {{ map.friendlyName }}
                </div>
            </div>
        </div>

        <div class="container">
          <div class="thumbnail">
            <BattleMapPreview
                :map="map.scriptName"
            />
          </div>
          <div class="details">
            <div class="detail-text"><b>Size:</b> {{map.width}} x {{map.height}}</div>
            <div class="detail-text"><b>Wind:</b> {{map.minWind}} - {{map.maxWind}}</div>
            <div class="detail-text"><b>Description:</b> {{map.description}}</div>
            <div class="detail-text"><b>Author:</b> {{map.mapInfo.author}}</div>
          </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";

import { MapData } from "@/model/map-data";
import BattleMapPreview from "@/components/maps/BattleMapPreview.vue";

const props = defineProps<{
    map: MapData;
}>();

const mapImageUrl = computed(() => {
  return require("@/assets/images/default-minimap.png");
});

const emit = defineEmits(["mapSelected"]);

function mapSelected() {
    emit("mapSelected", props.map);
}

</script>

<style lang="scss" scoped>
.map-preview {
    display: flex;
    flex-direction: column;
    position: relative;
    z-index: 0;
    gap: 5px;
    padding: 10px;
    font-weight: 500;

    .container {
      display: flex;
      flex-direction: row;
    }

    .details {
      display:flex;
      flex-direction: column;
      margin: 10px;
      width: 200px;
    }

    .detail-text {
      padding: 5px;
      font-weight: normal;
      font-size: 16px;
    };

    &:hover {
        .background {
            filter: brightness(1.1);
        }
    }

    .header {
        font-weight: 600;
    }

    .title {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 5px;
    }

    .background {
        @extend .fullsize;
        left: 0;
        top: 0;
        image-rendering: pixelated;
        z-index: -1;
        background-position: center;
        background-size: cover;
        overflow: hidden;
        filter: brightness(0.9);

        &:before {
            @extend .fullsize;
            left: 0;
            top: 0;
            transition: all 0.05s;
            background: linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0));
        }

        &:after {
            @extend .fullsize;
            left: 0;
            top: 0;
            border-top: 1px solid rgba(255, 255, 255, 0.2);
            border-left: 1px solid rgba(255, 255, 255, 0.1);
            border-right: 1px solid rgba(255, 255, 255, 0.1);
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
    }
}
</style>
