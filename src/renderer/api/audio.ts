import type { HowlOptions } from "howler";
import { Howl } from "howler";
import * as path from "path";
import { watch } from "vue";

export class Sound extends Howl {
    public key: string;
    public isMusic: boolean;

    constructor(key: string, isMusic: boolean, options: HowlOptions) {
        super(options);

        this.key = key;
        this.isMusic = isMusic;
    }
}

export class AudioAPI {
    public sounds: Map<string, Sound> = new Map();

    public async init() {
        if (this.sounds.size) {
            return this;
        }

        const audioFiles = import.meta.glob("@/assets/audio/**/*", { query: "?url", import: "default" });

        for (const filePath in audioFiles) {
            const isMusic = filePath.includes("music");
            const key = path.parse(filePath).name;
            const src = filePath.split("assets/")[1];
            const volume = isMusic ? api.settings.model.musicVolume / 100 : api.settings.model.sfxVolume / 100;

            const sound = new Sound(key, isMusic, { src, volume, preload: false, html5: true });

            sound.on("play", () => {
                this.sounds.forEach((_sound) => {
                    if (sound !== _sound && isMusic) {
                        _sound.stop();
                    }
                });
            });

            this.sounds.set(key, sound);
        }

        watch(
            () => api.settings.model.sfxVolume,
            () => {
                this.sounds.forEach((sound) => {
                    if (!sound.isMusic) {
                        sound.volume(api.settings.model.sfxVolume / 100);
                    }
                });
            }
        );

        watch(
            () => api.settings.model.musicVolume,
            () => {
                this.sounds.forEach((sound) => {
                    if (sound.isMusic) {
                        sound.volume(api.settings.model.musicVolume / 100);
                    }
                });
            }
        );

        return this;
    }

    public load() {
        this.sounds.forEach((sound) => {
            sound.load();
        });
    }

    public getAllSounds(): Sound[] {
        return Array.from(this.sounds.values());
    }

    public play(key: string) {
        const sound = this.sounds.get(key);
        if (sound) {
            sound.play();
            return sound;
        } else {
            console.error(`Could not find sound: ${key}`);
            return;
        }
    }

    public muteMusic(fadeTime = 4000) {
        const musicSounds = this.getAllSounds().filter((sound) => sound.isMusic);
        for (const sound of musicSounds) {
            sound.fade(sound.volume(), 0, fadeTime);
        }
    }

    public unmuteMusic(fadeTime = 4000) {
        const musicSounds = this.getAllSounds().filter((sound) => sound.isMusic);
        for (const sound of musicSounds) {
            sound.fade(0, api.settings.model.musicVolume / 100, fadeTime);
        }
    }
}
