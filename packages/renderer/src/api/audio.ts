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

        const audioFiles = import.meta.glob("../../assets/audio/**/*");

        for (const filePath in audioFiles) {
            const isMusic = filePath.includes("music");
            const key = path.parse(filePath).name;
            const src = ((await audioFiles[filePath]()) as any).default;
            const volume = isMusic ? api.settings.model.musicVolume.value / 100 : api.settings.model.sfxVolume.value / 100;

            const sound = new Sound(key, isMusic, { src, volume });

            sound.on("play", () => {
                this.sounds.forEach((_sound) => {
                    if (sound !== _sound && isMusic) {
                        _sound.stop();
                    }
                });
            });

            this.sounds.set(key, sound);
        }

        watch(api.settings.model.sfxVolume, () => {
            this.sounds.forEach((sound) => {
                if (!sound.isMusic) {
                    sound.volume(api.settings.model.sfxVolume.value / 100);
                }
            });
        });

        watch(api.settings.model.musicVolume, () => {
            this.sounds.forEach((sound) => {
                if (sound.isMusic) {
                    sound.volume(api.settings.model.musicVolume.value / 100);
                }
            });
        });

        return this;
    }

    public getSounds(): Sound[] {
        return Array.from(this.sounds.values());
    }

    public getSound(name: string) {
        return this.sounds.get(name)!;
    }

    public getPlayingSounds() {
        return this.getSounds().filter((sound) => sound.playing());
    }

    public muteMusic(fadeTime = 1000) {
        const musicSounds = this.getSounds().filter((sound) => sound.isMusic);
        for (const sound of musicSounds) {
            sound.fade(sound.volume(), 0, fadeTime);
        }
    }

    public unmuteMusic(fadeTime = 1000) {
        const musicSounds = this.getSounds().filter((sound) => sound.isMusic);
        for (const sound of musicSounds) {
            sound.fade(0, api.settings.model.musicVolume.value / 100, fadeTime);
        }
    }
}
