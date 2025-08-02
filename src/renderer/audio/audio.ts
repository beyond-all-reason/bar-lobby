// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { musicFiles, sfxFiles } from "@renderer/assets/assetFiles";
import { GameStatus, gameStore } from "@renderer/store/game.store";
import { settingsStore } from "@renderer/store/settings.store";
import type { HowlOptions } from "howler";
import { Howl } from "howler";
import { watch } from "vue";

class Sound extends Howl {
    public key: string;
    public isMusic: boolean;

    constructor(key: string, isMusic: boolean, options: HowlOptions) {
        super(options);
        this.key = key;
        this.isMusic = isMusic;
    }
}

class AudioAPI {
    public sounds: Map<string, Sound> = new Map();

    public async init() {
        if (this.sounds.size) {
            return this;
        }

        console.debug("Loading music files...");
        for (const filePath in musicFiles) {
            const name = filePath.split("/").pop()?.split(".")[0];
            console.debug(name);
            const src = musicFiles[filePath];
            const volume = settingsStore.musicVolume / 100;

            if (!name) {
                console.error(`something wrong with audio file located at ${filePath}`);
                continue;
            }

            const sound = new Sound(name, true, { src, volume, preload: false, html5: true });
            sound.on("play", () => {
                this.sounds.forEach((_sound) => {
                    if (sound !== _sound) {
                        _sound.stop();
                    }
                });
            });
            this.sounds.set(name, sound);
        }

        console.debug("Loading sfx files...");
        for (const filePath in sfxFiles) {
            const name = filePath.split("/").pop()?.split(".")[0] || "";
            console.debug(name);
            const src = sfxFiles[filePath];
            const volume = settingsStore.sfxVolume / 100;
            const sound = new Sound(name, false, { src, volume, preload: false, html5: true });
            this.sounds.set(name, sound);
        }

        watch(
            () => settingsStore.sfxVolume,
            () => {
                this.sounds.forEach((sound) => {
                    if (!sound.isMusic) {
                        sound.volume(settingsStore.sfxVolume / 100);
                    }
                });
            }
        );

        watch(
            () => settingsStore.musicVolume,
            () => {
                this.sounds.forEach((sound) => {
                    if (sound.isMusic) {
                        sound.volume(settingsStore.musicVolume / 100);
                    }
                });
            }
        );

        watch(
            () => gameStore.status,
            () => {
                if (gameStore.status === GameStatus.CLOSED) {
                    this.unmuteMusic();
                } else {
                    this.muteMusic(1200);
                }
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
        if (settingsStore.musicVolume > 0) {
            const musicSounds = this.getAllSounds().filter((sound) => sound.isMusic);
            for (const sound of musicSounds) {
                sound.fade(0, settingsStore.musicVolume / 100, fadeTime);
            }
        }
    }
}

export const audioApi = new AudioAPI();
