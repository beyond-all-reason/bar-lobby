import { randomFromArray } from "$/jaz-ts-utils/object";
import { audioApi } from "@renderer/audio/audio";

const musicKeys: string[] = [];

export function playRandomMusic() {
    const musicSounds = audioApi.getAllSounds().filter((sound) => sound.isMusic);
    const randomMusic = randomFromArray(musicSounds)!;
    randomMusic.once("end", () => {
        playRandomMusic();
    });
    randomMusic.play();
}
