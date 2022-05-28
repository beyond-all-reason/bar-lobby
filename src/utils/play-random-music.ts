import { randomFromArray } from "jaz-ts-utils";

const musicKeys: string[] = [];

export const playRandomMusic = () => {
    if (!musicKeys.length) {
        for (const [key, val] of api.audio.soundsToLoad.entries()) {
            if (val[1].includes("music")) {
                musicKeys.push(key);
            }
        }
    }

    const soundKey = randomFromArray(musicKeys)!;
    const sound = api.audio.getSound(soundKey);
    sound.on("end", () => {
        playRandomMusic();
    });
    sound.play();
};
