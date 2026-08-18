// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// window.shell throws straight past the renderer into the fatal error modal, so the renderer goes
// through a wrapper that reports the failure instead. shell.ts is the wrapper.
export const shellApiScope = {
    files: ["src/renderer/**/*.{ts,vue}"],
    ignores: ["src/renderer/api/shell.ts"],
};

export const noDirectShellCalls = {
    selector: "MemberExpression[object.name='window'][property.name='shell']",
    message: "Use shellApi from @renderer/api/shell so failures get reported instead of reaching the fatal error modal.",
};
