import { Howl } from "howler";
import { randomFromArray } from "jaz-ts-utils";

let allMusic: Howl[] = [];

export const playRandomMusic = () => {
    if (allMusic.length === 0) {
        allMusic = Array.from(window.api.audio.musicSounds.values());
    }

    const music = randomFromArray(allMusic);
    music.on("end", () => {
        playRandomMusic();
        music.unload();
    });
    music.play();
};