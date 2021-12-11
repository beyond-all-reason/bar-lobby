import { Howl } from "howler";
import * as path from "path";
import { watch } from "vue";

export class AudioAPI {
    public sfxSounds: Map<string, Howl> = new Map();
    public musicSounds: Map<string, Howl> = new Map();

    public init() {
        const soundFiles = require.context("@/assets/audio/", true).keys();
        for (const soundFile of soundFiles) {
            const relativePath = soundFile.slice(2);
            const parsedPath = path.parse(soundFile);
            const isMusic = parsedPath.dir.split("/")[1] === "music";
            const builtPath = require(`@/assets/audio/${relativePath}`);
            
            if (isMusic) {
                const sound = new Howl({
                    src: builtPath,
                    volume: window.api.settings.model.musicVolume.value / 100
                });
                this.musicSounds.set(parsedPath.name, sound);
            } else {
                const sound = new Howl({
                    src: builtPath,
                    volume: window.api.settings.model.sfxVolume.value / 100
                });
                this.sfxSounds.set(parsedPath.name, sound);
            }
        }

        watch(window.api.settings.model.musicVolume, () => {
            this.musicSounds.forEach(sound => sound.volume(window.api.settings.model.musicVolume.value / 100));
        });
        
        watch(window.api.settings.model.sfxVolume, () => {
            this.sfxSounds.forEach(sound => sound.volume(window.api.settings.model.sfxVolume.value / 100));
        });
        
        return this;
    }

    public getSfxPlay(name: string) {
        const sound = this.sfxSounds.get(name);
        if (!sound) {
            throw new Error(`Invalid sfx key specified: ${name}`);
        }
        return () => sound.play();
    }

    public getMusicPlay(name: string) {
        const sound = this.musicSounds.get(name);
        if (!sound) {
            throw new Error(`Invalid music key specified: ${name}`);
        }
        return () => sound.play();
    }

    public getPlayingSfx() {
        return Array.from(this.sfxSounds.values()).filter(howl => howl.playing());
    }

    public getPlayingMusic() {
        return Array.from(this.musicSounds.values()).filter(howl => howl.playing())[0];
    }
}