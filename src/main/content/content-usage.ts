// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { getAssetsPath } from "@main/config/app";
import { ContentRef, contentRefKey } from "@main/content/content-ref";
import { FileStore } from "@main/json/file-store";
import { contentUsageSchema } from "@main/json/model/content-usage";
import path from "path";

/**
 * Last-wanted timestamps, kept beside the content so repointing the assets directory carries its history.
 *
 * No entry means unseen, not old.
 */
class ContentUsage {
    private store?: FileStore<typeof contentUsageSchema>;

    // Re-read rather than reused, because the assets directory can be repointed while running.
    public async init() {
        this.store = await new FileStore(path.join(getAssetsPath(), "content-usage.json"), contentUsageSchema).init();
    }

    public lastUsed(ref: ContentRef) {
        const entry = this.entries().find((candidate) => this.matches(candidate, ref));
        const at = entry ? new Date(entry.lastUsed) : undefined;

        return at && !Number.isNaN(at.getTime()) ? at : undefined;
    }

    public async markUsed(refs: ContentRef[], at = new Date()) {
        if (refs.length === 0) {
            return;
        }

        const kept = this.entries().filter((entry) => !refs.some((ref) => this.matches(entry, ref)));
        const added = refs.map((ref) => ({ type: ref.type, id: ref.id, lastUsed: at.toISOString() }));

        await this.write({ usage: [...kept, ...added] });
    }

    // Drops everything about content that is no longer installed, so the file does not grow forever
    // with entries nothing can act on.
    public async forgetAllExcept(installed: ContentRef[]) {
        const keys = new Set(installed.map((ref) => contentRefKey(ref)));
        const usage = this.entries().filter((entry) => keys.has(`${entry.type}:${entry.id}`));

        if (usage.length === this.entries().length) {
            return;
        }

        await this.write({ usage });
    }

    private entries() {
        return this.store?.model.usage ?? [];
    }

    private matches(entry: { type: string; id: string }, ref: ContentRef) {
        return entry.type === ref.type && entry.id === ref.id;
    }

    private async write(data: Partial<typeof contentUsageSchema>) {
        if (!this.store) {
            throw new Error("Content usage store has not been initialised.");
        }

        await this.store.update(data);
    }
}

export const contentUsage = new ContentUsage();
