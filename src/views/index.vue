<template>
    <div class="load">
        <img v-for="imgSrc in imgSrcs" :key="imgSrc" :src="imgSrc">
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import { useRouter } from "vue-router";

export default defineComponent({
    layout: "empty",
    setup() {
        const imgSrcs = ref([] as Array<string>);
        
        const imageFiles = require.context("@/assets/images/", true).keys();
        for (const imageFile of imageFiles) {
            const fileName = imageFile.slice(2);
            const buildImagePath = require(`@/assets/images/${fileName}`);
            imgSrcs.value.push(buildImagePath);
        }

        const fontFiles = require.context("@/assets/fonts/", true).keys();
        for (const fontFile of fontFiles) {
            const parts = fontFile.split("/");
            const family = parts[1];
            const fileName = parts[2];
            const [weight, style] = fileName.split(".")[0].split("-");
            
            const buildFontPath = require(`@/assets/fonts/${family}/${fileName}`);
            const font = new FontFace(family, `url(${buildFontPath})`, { weight, style });
            font.load().then(() => {
                document.fonts.add(font);
            });
        }

        const router = useRouter();
        router.replace("/intro");

        return { imgSrcs };
    }
});
</script>

<style scoped lang="scss">
.load {
    position: absolute;
    opacity: 0;
}
</style>