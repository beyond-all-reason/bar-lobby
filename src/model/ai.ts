import { LuaOptionSection } from "@/model/lua-options";

export type EngineAI = {
    shortName: string;
    name: string;
    version: string;
    description: string;
    url?: string;
    loadSupported: boolean;
    interfaceShortName: string;
    interfaceVersion: string;
    ddlPath: string;
    options: LuaOptionSection[];
};

/*
 * TODO:
 *  All this stuff is gross, I just copied the behavior from chobby which is... eh
 *  Would love to find a better way to handle the distinction between engine AI and game AI
 */

/*
 * chobby did not add STAI manually, but it doesn't show as an engine AI, I do not know how chobby
 * gets it in the UI. Adding it manually here seems to work.
 */
export const gameAis = [
    "ChickensAI",
    "ScavengersAI",
    "STAI",
    "SimpleAI",
    "SimpleDefenderAI",
    "SimpleConstructorAI",
    "ControlModeAI",
];

export const aiDescription = new Map<string, string>([
    ['SimpleAI', "A simple, easy playing beginner AI (Great for your first game!)"],
    ['SimpleDefenderAI', "An easy AI, mostly defends and doesnt attack much"],
    ['ScavengersAI', "This is a PvE game mode, with an increasing difficulty waves of Scavenger AI controlled units attacking the players. Only add 1 per game."],
    ['STAI', "A medium to hard difficulty, experimental, non cheating AI."],
    ['NullAI', "A game-testing AI. Literally does nothing."],
    ['BARb', "The recommended excellent performance, adjustable difficulty, non-cheating AI. Add as many as you wish!"],
    ['ChickensAI', "This is a PvE game mode, where hordes of alien creatures attack the players. Only add 1 per game."],
]);

const aiFriendlyName = new Map<string, string>([
    ['BARb', "BARbarian AI"],
    ['NullAI', "Inactive AI"],
    ['ScavengersAI', "ScavengersDefense AI"],
    ['ChickensAI', "RaptorsDefense AI"],
]);

export function getAiFriendlyName(name: string) {
    return aiFriendlyName.get(name) ?? name;
}

export function getAiDescription(name: string) {
    return aiDescription.get(name) ?? "";
}
