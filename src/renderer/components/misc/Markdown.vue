<template>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div class="text" v-html="processedText"></div>
</template>
<script lang="ts" setup>
import markdownRenderer from "@renderer/utils/mardown";
import { computedAsync } from "@vueuse/core";
import DOMPurify from "dompurify";
import { marked } from "marked";

const props = defineProps<{
    source: string;
    allowLinks?: boolean;
}>();

const allowedTags = ["p", "em", "b", "strong", "ul", "ol", "li", "code", "pre", "blockquote", "span", "del", "body"];
const allowedAttributes: string[] = [];
if (props.allowLinks) {
    allowedTags.push("a");
    allowedAttributes.push("href");
    allowedAttributes.push("target");
    // markdownRenderer.link = (href, title, text) => {
    //     return `<a href="${href}" target="_blank">${text}</a>`;
    // };
}

const processedText = computedAsync(async () => {
    const markdown = await marked.parse(props.source, { renderer: markdownRenderer });
    return DOMPurify.sanitize(markdown, {
        ALLOWED_ATTR: allowedAttributes,
        ALLOWED_TAGS: allowedTags,
    });
});
</script>
<style lang="scss" scoped>
.text {
    width: 100%;
    word-break: break-word;
    padding: 4px 8px;
    user-select: text;
    .system & {
        color: rgb(82, 215, 255);
        font-weight: 600;
    }

    :deep(code) {
        border-radius: 5px;
        border: 1px solid #bcbec0;
        padding: 1px;
        background-color: #272822;
        font-family: monospace;
    }
}
</style>
