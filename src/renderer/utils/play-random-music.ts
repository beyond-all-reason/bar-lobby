// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { randomFromArray } from "$/jaz-ts-utils/object";
import { audioApi } from "@renderer/audio/audio";

export function playRandomMusic() {
    const musicSounds = audioApi.getAllSounds().filter((sound) => sound.isMusic);
    const randomMusic = randomFromArray(musicSounds)!;
    randomMusic.once("end", () => {
        playRandomMusic();
    });
    randomMusic.play();
}
