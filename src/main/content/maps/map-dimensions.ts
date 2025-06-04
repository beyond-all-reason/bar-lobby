// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

const BLOCK_SIZE = 512;

// Dimensions
export function blockToPixel({ width, height }: { width: number; height: number }) {
    return {
        width: width * BLOCK_SIZE,
        height: height * BLOCK_SIZE,
    };
}

export function pixelToBlock({ width, height }: { width: number; height: number }) {
    return {
        width: Math.round(width / BLOCK_SIZE),
        height: Math.round(height / BLOCK_SIZE),
    };
}
