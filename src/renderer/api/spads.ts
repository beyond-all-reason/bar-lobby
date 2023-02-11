import { spadsResponseDefinitions } from "@/model/spads/spads-responses";
import { SpadsCommandDefinition } from "@/model/spads/spads-types";

export class SpadsApi {
    protected commandDefinitions: SpadsCommandDefinition[] = [];

    public handleAnnouncement<T extends { message: string; sender_id: number; lobby_id?: number }>(announcement: T) {
        const battle = announcement.lobby_id !== undefined ? api.session.battles.get(announcement.lobby_id) : api.session.onlineBattle.value;

        if (!battle) {
            console.error("Received announcement for an unknown battle", announcement);
            return;
        }

        for (const definition of spadsResponseDefinitions) {
            if (!definition.regex.test(announcement.message)) {
                continue;
            }

            if (!definition.handler) {
                return;
            }

            const matches = announcement.message.match(definition.regex);
            if (!matches) {
                console.error(`SPADS response definition found but matches could not be processed: ${definition.name}`);
                return;
            }

            const groups = matches.groups;
            if (!groups) {
                console.error(`Error parsing regex capture groups for SPADS response: ${definition.name}`);
                return;
            }

            const valid = definition.validator(groups);
            if (!valid) {
                console.error(`SPADS response definition failed schema validation: ${definition.name}`, definition.validator.errors);
                return;
            }

            return definition.handler(groups, battle);
        }

        console.warn(`Missing or faulty SPADS response handler for announcement: "${announcement.message}"`);
    }
}
