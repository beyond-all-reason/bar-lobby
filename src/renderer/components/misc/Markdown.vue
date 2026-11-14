<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div class="text" @click="handleClick" v-html="processedText"></div>
</template>
<script lang="ts" setup>
import { linkifyLobbyProtocolUrls } from "@renderer/utils/lobby-protocol-links";
import markdownRenderer from "@renderer/utils/mardown";
import { computedAsync } from "@vueuse/core";
import DOMPurify from "dompurify";
import { marked } from "marked";

const props = defineProps<{
    source: string;
    allowLinks?: boolean;
    allowProtocolLinks?: boolean;
}>();

const lobbyProtocolPrefix = `${window.lobbyProtocol.scheme}://`;

let cachedLabels: Record<string, string> | undefined;
let labelsRequest: Promise<Record<string, string>> | undefined;

function getLabels(): Promise<Record<string, string>> {
    labelsRequest ??= window.lobbyProtocol
        .getLabels()
        .then((labels) => (cachedLabels = labels))
        .catch((err) => {
            labelsRequest = undefined;
            throw err;
        });
    return labelsRequest;
}

async function linkify(text: string): Promise<string> {
    return linkifyLobbyProtocolUrls(text, window.lobbyProtocol.scheme, cachedLabels ?? (await getLabels()));
}

const allowedTags = ["p", "em", "b", "strong", "ul", "ol", "li", "code", "pre", "blockquote", "span", "del", "body"];
const allowedAttributes: string[] = [];
if (props.allowLinks || props.allowProtocolLinks) {
    allowedTags.push("a");
    allowedAttributes.push("href");
    allowedAttributes.push("target");
}

const purify = DOMPurify();
if (props.allowProtocolLinks && !props.allowLinks) {
    purify.addHook("afterSanitizeAttributes", (node) => {
        if (node.tagName === "A") {
            const href = node.getAttribute("href");
            if (!href || !href.startsWith(lobbyProtocolPrefix)) {
                const text = document.createTextNode(node.textContent || "");
                node.replaceWith(text);
            }
        }
    });
}

const processedText = computedAsync(async () => {
    const source = props.allowProtocolLinks ? await linkify(props.source) : props.source;
    const markdown = await marked.parse(source, { renderer: markdownRenderer });
    return purify.sanitize(markdown, {
        ALLOWED_ATTR: allowedAttributes,
        ALLOWED_TAGS: allowedTags,
        ...(props.allowProtocolLinks && {
            ALLOWED_URI_REGEXP: props.allowLinks
                ? new RegExp(
                      `^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|${window.lobbyProtocol.scheme}):|[^a-z]|[a-z+.\\-]+(?:[^a-z+.\\-:]|$))`,
                      "i"
                  )
                : new RegExp(`^${window.lobbyProtocol.scheme}:`, "i"),
        }),
    });
});

function handleClick(event: MouseEvent) {
    const anchor = (event.target as HTMLElement).closest("a");
    if (anchor) {
        event.preventDefault();
        const href = anchor.getAttribute("href");
        if (href?.startsWith(lobbyProtocolPrefix)) {
            window.lobbyProtocol.handleUrl(href);
        }
    }
}
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

    :deep(a) {
        color: #4fc3f7;
        text-decoration: underline;
        cursor: pointer;
    }
}
</style>
