// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { audioApi, type Sound } from "@renderer/audio/audio";

/**
 * Performs random shuffle of array in-place.
 */
function shuffle<T>(array: T[]) {
    for (let i = 0; i < array.length - 1; ++i) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * Takes a list of tracks and generates a random infinite plylist from them.
 *
 * It's quite naive implementation that only guarantees that the same track
 * won't be returned twice in order.
 */
class InfiniteRandomPlaylist {
    private playlist: string[];
    private currentIndex: number;

    constructor(tracks: string[]) {
        this.playlist = [...tracks];
        shuffle(this.playlist);
        this.currentIndex = 0;
    }

    next(): string {
        const next = this.playlist[this.currentIndex++];
        if (this.currentIndex >= this.playlist.length) {
            do {
                shuffle(this.playlist);
            } while (this.playlist[0] === next);
            this.currentIndex = 0;
        }
        return next;
    }
}

// Maybe those should be attached somehwere as metadata of music files, but, I don't
// think those music files are going to change very often so hardcoding should be
// good enough for now. We verify in `playRandomMusic` that all music files are being
// listed here.
const peaceTracks = ["Matteo_Dell_Acqua-From_the_Ashes", "Matteo_Dell_Acqua-Game_of_Chicken", "Ryan_Krause-Divergents", "Ryan_Krause-Sanctum", "Ryan_Krause-The_Architect", "Ryan_Krause-New_Order"];
const introTracks = ["Matteo_Dell_Acqua-fooBAR_Menu_Ver", "Ryan_Krause-Confined_Chaos", "Ryan_Krause-Friend_Or_Foe"];

export function playRandomMusic() {
    const musicSounds = new Map<string, Sound>();
    for (const sound of audioApi.getAllSounds()) {
        if (sound.isMusic) {
            musicSounds.set(sound.key, sound);
        }
    }

    const notMatchingTracks = new Set(musicSounds.keys()).symmetricDifference(new Set([...peaceTracks, ...introTracks]));
    if (notMatchingTracks.size > 0) {
        throw new Error(`The music assets and peace/intro tracks are not the same: {${Array.from(notMatchingTracks).join(", ")}}, did you add/remove some new music?`);
    }

    const peacePlaylist = new InfiniteRandomPlaylist(peaceTracks);
    const introPlaylist = new InfiniteRandomPlaylist(introTracks);
    let previousPlaylist: "peace" | "intro" = "peace";

    function getNextTrack() {
        if (previousPlaylist === "peace") {
            previousPlaylist = "intro";
            return introPlaylist.next();
        } else {
            previousPlaylist = "peace";
            return peacePlaylist.next();
        }
    }

    function playNext() {
        const nextTrack = getNextTrack();
        const randomMusic = musicSounds.get(nextTrack)!;
        randomMusic.once("end", playNext);
        randomMusic.play();
    }

    playNext();
}
