import { randomFromArray } from "jaz-ts-utils";

const musicKeys: string[] = [];

export const playRandomMusic = () => {
    const musicSounds = api.audio.getSounds().filter((sound) => sound.isMusic);
    for (const sound of musicSounds) {
        sound.on("end", () => {
            playRandomMusic();
        });
    }

    if (!api.audio.getPlayingSounds().some((sound) => sound.isMusic)) {
        const randomMusic = randomFromArray(musicSounds)!;
        randomMusic.play();
    }
};
