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
    public soundsToLoad: Map<string, [string, string]> = new Map();
    public sounds: Map<string, Sound> = new Map();

    public init() {
        if (this.sounds.size) {
            return this;
        }

        const soundFiles = require.context("@/assets/audio/", true).keys();
        for (const soundFile of soundFiles) {
            const relativePath = soundFile.slice(2);
            const parsedPath = path.parse(soundFile);
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const builtPath = require(`@/assets/audio/${relativePath}`);
            const soundKey = parsedPath.name;

            this.soundsToLoad.set(soundKey, [builtPath, relativePath]);
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

    public getSound(name: string): Sound {
        const sound = this.setupSound(name);
        return sound;
    }

    public getPlayingSounds() {
        return this.getSounds().filter((sound) => sound.playing());
    }

    protected setupSound(soundKey: string) {
        if (this.sounds.get(soundKey)) {
            return this.sounds.get(soundKey)!;
        }

        const path = this.soundsToLoad.get(soundKey);

        if (!path) {
            throw new Error(`Sound file with key ${soundKey} was not found`);
        }

        const isMusic = path[1].includes("music");

        if (isMusic) {
            const sound = new Sound(soundKey, true, {
                src: this.soundsToLoad.get(soundKey),
                volume: api.settings.model.musicVolume.value / 100,
            });
            sound.on("play", () => {
                this.sounds.forEach((_sound) => {
                    if (sound !== _sound && _sound.isMusic) {
                        _sound.stop();
                    }
                });
            });
            this.sounds.set(soundKey, sound);
        } else {
            const sound = new Sound(soundKey, false, {
                src: this.soundsToLoad.get(soundKey),
                volume: api.settings.model.sfxVolume.value / 100,
            });
            this.sounds.set(soundKey, sound);
        }

        return this.sounds.get(soundKey)!;
    }
}
