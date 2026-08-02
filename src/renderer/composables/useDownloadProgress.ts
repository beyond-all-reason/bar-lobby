// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { computed } from "vue";

import type { DownloadInfo } from "@main/content/downloads";
import { downloadsStore } from "@renderer/store/downloads.store";
import { useTypedI18n } from "@renderer/i18n";

const EMA_ALPHA = 0.3;
const STALL_DECAY = 0.9;
const MIN_UPDATE_INTERVAL = 0.25;
export const MIN_DOWNLOAD_BYTES = 5 * 1024; // 5 KB

interface SpeedEntry {
    prevBytes: number;
    prevTime: number;
    speed: number;
}

const speedTracker = new Map<string, SpeedEntry>();

export function useDownloadProgress() {
    const { t } = useTypedI18n();

    const allDownloads = computed(() => [...downloadsStore.engineDownloads, ...downloadsStore.gameDownloads, ...downloadsStore.mapDownloads, ...downloadsStore.updateDownloads]);

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

    function downloadPercent(download: DownloadInfo): number {
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

    function progressText(download: DownloadInfo): string {
        if (download.currentBytes === 0) return t("lobby.navbar.downloads.starting");

        const now = Date.now();
        const key = download.name;
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
