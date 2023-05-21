<template>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div v-if="noLoss" class="text" v-html="processedText"></div>
    <div v-else class="text">{{ props.text }}</div>
</template>
<script lang="ts" setup>
import DOMPurify from 'dompurify';
import { marked } from 'marked';

const props = defineProps<{
    text: string;
}>();

// Prevents marked from parsing #.
marked.use({
    tokenizer: {
        heading() {return false;}
    }
})

const sanitizeOptions: DOMPurify.Config = {
    ALLOWED_ATTR: [],
    ALLOWED_TAGS: [
        'p',
        'em',
        'b',
        'strong',
        'ul',
        'ol',
        'li',
        'code',
        'pre',
        'blockquote',
        'span',
        'del',
    ]
}

const markdown = marked.parse(props.text);
const processedText = DOMPurify.sanitize(markdown, sanitizeOptions);
const noLoss = markdown === processedText;

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