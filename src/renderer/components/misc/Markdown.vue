<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div class="text" @click="handleClick" v-html="processedText"></div>
</template>
<script lang="ts" setup>
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
const lobbyProtocolUrlPattern = new RegExp(`(?<![([])${window.lobbyProtocol.scheme}://[^\\s)\\]>]+`, "g");

let cachedLabels: Record<string, string> | null = null;

function resolveLabel(rawUrl: string, labels: Record<string, string>): string | null {
    let url: URL;
    try {
        url = new URL(rawUrl);
    } catch {
        return null;
    }
    const key = `${url.hostname}/${url.pathname.slice(1)}`;
    const template = labels[key];
    if (!template) return null;
    return template.replace(/\{(\w+)\}/g, (_m, param) => url.searchParams.get(param) ?? param);
}

async function linkifyLobbyProtocolUrls(text: string): Promise<string> {
    if (!cachedLabels) {
        cachedLabels = await window.lobbyProtocol.getLabels();
    }
    return text.replace(lobbyProtocolUrlPattern, (match) => {
        const label = resolveLabel(match, cachedLabels!) ?? match;
        return `[${label}](${match})`;
    });
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
    const source = props.allowProtocolLinks ? await linkifyLobbyProtocolUrls(props.source) : props.source;
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
    const target = event.target as HTMLElement;
    if (target.tagName === "A") {
        event.preventDefault();
        const href = target.getAttribute("href");
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
