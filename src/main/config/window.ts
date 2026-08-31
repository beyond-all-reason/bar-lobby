// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// Device independent pixels throughout. Chromium and the OS translate to physical pixels,
// so a size given here is the same physical size on any display and needs no conversion.

// Smallest and largest window the layout is expected to work in.
export const MIN_WINDOW_SIZE = { width: 1280, height: 720 };

// Smallest CSS viewport the layout can render in. Zoom is capped so it is never smaller.
export const MIN_VIEWPORT = { width: 1280, height: 720 };

// Windowed sizes are offered across this range of shapes; fullscreen uses the display's own.
export const SUPPORTED_ASPECT_RATIOS = [
    { label: "4:3", ratio: 4 / 3 },
    { label: "16:10", ratio: 16 / 10 },
    { label: "16:9", ratio: 16 / 9 },
    { label: "21:9", ratio: 21 / 9 },
];

export const WINDOW_HEIGHT_STEPS = [720, 900, 1080, 1200, 1440];

// Absolute interface scale, in the same units the OS calls its scaling percentage.
export const UI_SCALE_MIN = 0.75;
export const UI_SCALE_MAX = 2.5;
export const UI_SCALE_STEP = 0.05;

export const clampUiScale = (scale: number) => Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, scale));
