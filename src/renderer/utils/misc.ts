// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { intervalToDuration } from "date-fns";

export function getFriendlyDuration(durationMs: number, withSeconds = true) {
    const durationValues = intervalToDuration({ start: 0, end: durationMs });
    let durationStr = "";
    if (durationValues.years) {
        durationStr += `${durationValues.years}y `;
    }
    if (durationValues.months) {
        durationStr += `${durationValues.months}mo `;
    }
    if (durationValues.days) {
        durationStr += `${durationValues.days}d `;
    }
    if (durationValues.hours) {
        durationStr += `${durationValues.hours}h `;
    }
    if (durationValues.minutes) {
        durationStr += `${durationValues.minutes}m `;
    }
    if (withSeconds && durationValues.seconds) {
        durationStr += `${durationValues.seconds}s`;
    }
    return durationStr;
}
