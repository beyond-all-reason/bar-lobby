// This returns an object with relative path and url of the files
// i.e. { "./audio/music/track1.mp3": "/path/to/track1.mp3" }
// The value could be an url or a data: url. Check out sfxFiles in production app for example

// Sounds
export const musicFiles = import.meta.glob<string>("./audio/music/*", { eager: true, import: "default", query: "?url" });
export const sfxFiles = import.meta.glob<string>("./audio/sfx/*", { eager: true, import: "default", query: "?url" });

// Videos
export const introVideos = import.meta.glob<string>("./videos/intros/*", { eager: true, import: "default", query: "?url" });

// Images
export const backgroundImages = import.meta.glob<string>("./images/backgrounds/*", { eager: true, import: "default", query: "?url" });

// Fonts
export const fontFiles = import.meta.glob<string>("./fonts/*", { eager: true, import: "default", query: "?url" });

// Languages
export const localeFilePaths = import.meta.glob<Record<string, string>>("./languages/*", { eager: true, import: "default", query: "?url" });
