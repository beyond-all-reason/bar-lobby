// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { useTypedI18n } from "@renderer/i18n";
import type { LanguageTables } from "@shared/content/content-text";
import { resolveContentText } from "@shared/content/content-text";

// Text from singleplayer content's own language/ folders, in the lobby's current language. `tables` runs
// from the most specific folder to the least, such as a mission's and then its campaign's.
export function useContentText() {
    const { locale } = useTypedI18n();

    return (key: string, ...tables: LanguageTables[]) => resolveContentText(key, locale.value, tables);
}
