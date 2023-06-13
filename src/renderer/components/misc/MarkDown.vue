<template>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div v-if="noLoss" class="text" v-html="processedText"></div>
    <div v-else class="text">{{ props.text }}</div>
</template>
<script lang="ts" setup>
import DOMPurify from "dompurify";
import { marked, Renderer } from "marked";

const props = defineProps<{
    text: string;
    allowLinks?: boolean;
}>();

const markdownRenderer = new Renderer();

// Prevents marked from parsing #.
marked.use({
    tokenizer: {
        heading() {
            return false;
        }
    }
})

const allowedTags = ["p","em","b","strong","ul","ol","li","code","pre","blockquote","span","del","body"];

const allowedAttributes: string[] = [];

if (props.allowLinks) {
    allowedTags.push("a");

    allowedAttributes.push("href");
    allowedAttributes.push("target");

    markdownRenderer.link = (href, title, text) => {
        return `<a href="${href}" target="_blank">${text}</a>`;
    }
}

const sanitizeOptions: DOMPurify.Config = {
    ALLOWED_ATTR: allowedAttributes,
    ALLOWED_TAGS: allowedTags,
}

const markdown = marked.parse(props.text, {renderer: markdownRenderer});
const processedText = DOMPurify.sanitize(markdown, sanitizeOptions);
const noLoss = !props.allowLinks ? markdown === processedText : DOMPurify.removed.length === 0;

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
        border: 1px solid #BCBEC0;
        padding: 1px;
        background-color: #272822;
        font-family: monospace;
    }
}
</style>