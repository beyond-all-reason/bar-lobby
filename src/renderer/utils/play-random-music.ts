import { randomFromArray } from "jaz-ts-utils";

const musicKeys: string[] = [];

export function playRandomMusic() {
    const musicSounds = api.audio.getAllSounds().filter((sound) => sound.isMusic);
    const randomMusic = randomFromArray(musicSounds)!;
    randomMusic.once("end", () => {
        playRandomMusic();
    });
    randomMusic.play();
}
