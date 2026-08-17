// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { computed } from "vue";

import { contentsStore } from "@renderer/store/contents.store";
import { hasFailed, isInProgress } from "@main/content/content-state";
import { downloadsStore } from "@renderer/store/downloads.store";
import { useTypedI18n } from "@renderer/i18n";

const EMA_ALPHA = 0.3;
const STALL_DECAY = 0.9;
const MIN_UPDATE_INTERVAL = 0.25;
export const MIN_DOWNLOAD_BYTES = 5 * 1024; // 5 KB

// Content and the app updater are unrelated sources that the navbar shows in one list, so both get
// flattened to this before anything tries to render or measure them.
export type DownloadView = {
    key: string;
    name: string;
    type: string;
    currentBytes: number;
    totalBytes: number;
    phase?: "downloading" | "extracting";
    // What this row stands for. More than one name means pr-downloader fetched them as a single
    // transfer and its figures describe the set, not any one of them.
    members: string[];
    transfer?: string;
};

interface SpeedEntry {
    prevBytes: number;
    prevTime: number;
    speed: number;
}

const speedTracker = new Map<string, SpeedEntry>();

export function useDownloadProgress() {
    const { t } = useTypedI18n();

    const allDownloads = computed<DownloadView[]>(() => [
        ...contentsStore.inFlight.filter(isInProgress).map((state) => ({
            key: `${state.type}:${state.id}`,
            name: state.id,
            type: state.type,
            currentBytes: state.currentBytes,
            totalBytes: state.totalBytes,
            phase: state.phase,
            members: [state.id],
            transfer: state.transfer,
        })),
        ...(contentsStore.poolPrefetch
            ? [
                  {
                      key: "pool:prefetch",
                      name: "pool-data",
                      type: "pool",
                      currentBytes: contentsStore.poolPrefetch.currentBytes,
                      totalBytes: contentsStore.poolPrefetch.totalBytes,
                      phase: contentsStore.poolPrefetch.phase,
                      members: ["pool-data"],
                  },
              ]
            : []),
        ...downloadsStore.updateDownloads.map((download) => ({
            key: `update:${download.name}`,
            name: download.name,
            type: download.type,
            currentBytes: download.currentBytes,
            totalBytes: download.totalBytes,
            phase: download.phase,
            members: [download.name],
        })),
    ]);

    // One row per transfer rather than per ref. pr-downloader hands back one set of figures for a whole
    // batch, so listing each ref separately repeats the same bytes, size and speed several times over and
    // reads as several downloads of the batch's total size. Counted separately from the figure above,
    // which still has to weigh each piece of content it was asked for.
    const downloadRows = computed<DownloadView[]>(() => {
        const rows: DownloadView[] = [];
        const byTransfer = new Map<string, DownloadView>();

        for (const download of allDownloads.value) {
            if (!download.transfer) {
                rows.push(download);
                continue;
            }

            const existing = byTransfer.get(download.transfer);
            if (existing) {
                existing.members.push(...download.members);
                existing.name =
                    existing.type === "game"
                        ? t("lobby.navbar.downloads.batchedGames", { count: existing.members.length })
                        : t("lobby.navbar.downloads.batchedMaps", { count: existing.members.length });
                continue;
            }

            const row = { ...download, key: `${download.type}:${download.transfer}`, members: [...download.members] };
            byTransfer.set(download.transfer, row);
            rows.push(row);
        }

        return rows;
    });

    // The same set the fractions below are summed over. A status counted here but not there, as a
    // failure used to be, holds the figure short of full for everything downloading beside it.
    const outstandingCount = computed(() => contentsStore.inFlight.filter(isInProgress).length + (contentsStore.poolPrefetch ? 1 : 0) + downloadsStore.updateDownloads.length);

    const failedCount = computed(() => contentsStore.inFlight.filter(hasFailed).length);

    const anythingRunning = computed(
        () =>
            contentsStore.inFlight.some(isInProgress) ||
            contentsStore.poolPrefetch !== null ||
            downloadsStore.updateDownloads.some((download) => download.totalBytes === 0 || download.currentBytes < download.totalBytes)
    );

    // Failures hold their share whether or not anything is still moving, so the navbar keeps saying a
    // download did not make it after everything else has stopped.
    const totalCount = computed(() => contentsStore.settledCount + outstandingCount.value + failedCount.value);

    // Counted in content, not bytes: only content a worker picked up knows its size, so a byte
    // denominator jumps every time a slot frees.
    const totalDownloadPercent = computed(() => {
        const total = totalCount.value;

        if ((!anythingRunning.value && failedCount.value === 0) || total <= 0) {
            return 0;
        }

        let done = contentsStore.settledCount;
        for (const download of allDownloads.value) {
            if (download.totalBytes > 0) {
                done += Math.min(1, download.currentBytes / download.totalBytes);
            }
        }

        return Math.min(1, done / total);
    });

    // Sits above the filled part rather than inside it, so what failed reads as its own share of the
    // work asked for instead of eating into what did land.
    const failedDownloadPercent = computed(() => {
        const total = totalCount.value;

        if (failedCount.value === 0 || total <= 0) {
            return 0;
        }

        return failedCount.value / total;
    });

    // Clamped because a row drives a bar width and a percentage caption, and pr-downloader reports file
    // counts and bytes down the same channel, so a reading can come back over its own total.
    function downloadPercent(download: DownloadView): number {
        if (download.totalBytes <= 0) return 0;

        return Math.min(1, download.currentBytes / download.totalBytes);
    }

    function formatSpeed(bytesPerSec: number): string {
        if (bytesPerSec >= 1024 * 1024) return t("lobby.navbar.downloads.speedMBps", { speed: (bytesPerSec / (1024 * 1024)).toFixed(1) });
        if (bytesPerSec >= 1024) return t("lobby.navbar.downloads.speedKBps", { speed: (bytesPerSec / 1024).toFixed(1) });
        return t("lobby.navbar.downloads.speedBps", { speed: bytesPerSec.toFixed(0) });
    }

    function formatEta(seconds: number): string {
        if (seconds >= 3600)
            return t("lobby.navbar.downloads.etaHoursMinutes", {
                hours: Math.floor(seconds / 3600),
                minutes: Math.floor((seconds % 3600) / 60),
            });
        if (seconds >= 60)
            return t("lobby.navbar.downloads.etaMinutesSeconds", {
                minutes: Math.floor(seconds / 60),
                seconds: Math.floor(seconds % 60),
            });
        return t("lobby.navbar.downloads.etaSeconds", { seconds: Math.floor(seconds) });
    }

    function progressText(download: DownloadView): string {
        if (download.currentBytes === 0) return t("lobby.navbar.downloads.starting");

        const now = Date.now();
        const key = download.key;
        const prev = speedTracker.get(key);

        let speed = 0;
        if (prev) {
            const dt = (now - prev.prevTime) / 1000;
            if (dt > MIN_UPDATE_INTERVAL) {
                const rawSpeed = (download.currentBytes - prev.prevBytes) / dt;
                speed = rawSpeed > 0 ? prev.speed * (1 - EMA_ALPHA) + rawSpeed * EMA_ALPHA : prev.speed * STALL_DECAY;
                speedTracker.set(key, { prevBytes: download.currentBytes, prevTime: now, speed });
            } else {
                speed = prev.speed;
            }
        } else {
            speedTracker.set(key, { prevBytes: download.currentBytes, prevTime: now, speed: 0 });
        }

        const currentMB = (download.currentBytes / (1024 * 1024)).toFixed(1);
        const totalMB = (download.totalBytes / (1024 * 1024)).toFixed(1);
        const percent = (downloadPercent(download) * 100).toFixed(1);

        let text = t("lobby.navbar.downloads.progressMB", { current: currentMB, total: totalMB, percent });

        if (speed > 0) {
            text += ` · ${formatSpeed(speed)}`;
            const remaining = download.totalBytes - download.currentBytes;
            if (remaining > 0) {
                text += ` · ${formatEta(remaining / speed)}`;
            }
        }

        return text;
    }

    return {
        allDownloads,
        downloadRows,
        totalDownloadPercent,
        failedDownloadPercent,
        downloadPercent,
        progressText,
    };
}
