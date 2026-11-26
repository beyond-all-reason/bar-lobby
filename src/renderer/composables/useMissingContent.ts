// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ref, Ref, watch } from "vue";
import { ContentRef } from "@main/content/content-ref";
import { contentApi } from "@renderer/api/content";
import { contentsStore } from "@renderer/store/contents.store";

/**
 * Which of the given content is not installed, re-asked whenever the refs or the installed content change.
 * Undefined until the first answer comes back, so callers never act on unchecked content.
 */
export function useMissingContent(refs: Readonly<Ref<ContentRef[]>>) {
    const missing = ref<ContentRef[] | undefined>(undefined);

    watch(
        [refs, () => contentsStore.revision],
        async (_current, _previous, onCleanup) => {
            // Answers can arrive out of the order they were asked in, and a stale one would decide what is missing.
            let superseded = false;
            onCleanup(() => (superseded = true));

            const answer = await contentApi.missing(refs.value);
            if (!superseded) {
                missing.value = answer;
            }
        },
        { immediate: true }
    );

    return missing;
}
