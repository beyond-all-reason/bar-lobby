// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// This returns an object with relative path and url of the files
// i.e. { "./audio/music/track1.mp3": "/path/to/track1.mp3" }
// The value could be an url or a data: url. Check out sfxFiles in production app for example

// Sounds
export const musicFiles = import.meta.glob<string>(["./audio/music/*", "!**/*.license"], { eager: true, import: "default", query: "?url" });
export const sfxFiles = import.meta.glob<string>(["./audio/sfx/*", "!**/*.license"], { eager: true, import: "default", query: "?url" });

// Videos
export const introVideos = import.meta.glob<string>(["./videos/intros/*", "!**/*.license"], { eager: true, import: "default", query: "?url" });

// Images
export const backgroundImages = import.meta.glob<string>(["./images/backgrounds/*", "!**/*.license"], { eager: true, import: "default", query: "?url" });

// Fonts
export const fontFiles = import.meta.glob<string>(["./fonts/*", "!**/*.license"], { eager: true, import: "default", query: "?url" });

// Languages
export const localeFilePaths = import.meta.glob<string>(["./languages/**/*", "!**/*.license"], { eager: true, import: "default", query: "?url" });
