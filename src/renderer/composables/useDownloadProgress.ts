// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { computed } from "vue";

import { contentsStore } from "@renderer/store/contents.store";
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
        ...contentsStore.inFlight
            .filter((state) => state.status === "queued" || state.status === "acquiring")
            .map((state) => ({
                key: `${state.type}:${state.id}`,
                name: state.id,
                type: state.type,
                currentBytes: state.currentBytes,
                totalBytes: state.totalBytes,
                phase: state.phase,
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
        })),
    ]);

    const totalDownloadPercent = computed(() => {
        if (allDownloads.value.length === 0) return 0;
        let currentBytes = 0;
        let totalBytes = 0;
        for (const d of allDownloads.value) {
            currentBytes += d.currentBytes;
            totalBytes += d.totalBytes;
        }
        return currentBytes / totalBytes || 0;
    });

    const totalDownloadBytes = computed(() => {
        let currentBytes = 0;
        let totalBytes = 0;
        for (const d of allDownloads.value) {
            currentBytes += d.currentBytes;
            totalBytes += d.totalBytes;
        }
        return { current: currentBytes, total: totalBytes };
    });

    function downloadPercent(download: DownloadView): number {
        if (download.totalBytes <= 0) return 0;
        return download.currentBytes / download.totalBytes;
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
        totalDownloadPercent,
        totalDownloadBytes,
        downloadPercent,
        progressText,
    };
}
