import { SpadsCommandDefinition, SpadsVote } from "@/config/spads";

// https://github.com/Yaribz/SPADS/blob/bff5abe54adadba2e6f65beb1ee4aa9fc6e02156/src/spads.pl#L3783
const voteRegex =
    /\* Vote in progress: "(?<command>.*?)" \[y:(?<yesVotes>\d*)\/(?<requiredYesVotes>\d*)(?:\((?<maxYesVotes>\d*)\))?, n:(?<noVotes>\d*)\/(?<requiredNoVotes>\d*)(?:\((?<maxNoVotes>\d*)\))?] \((?<seconds>\d*)s.*/;

/**
 * TODO
 * - this class should attempt to parse command definitions from spads
 * - probably pm a spads bot with !helpall and parse info from there
 * - should this info be cached as json? maybe not necessary
 */
export class SpadsApi {
    protected commandDefinitions: SpadsCommandDefinition[] = [];

    public parseVoteText(text: string): SpadsVote {
        // * Vote in progress: "bKick art33mu3" [y:2/9, n:2/8] (27s remaining)
        // * Vote in progress: "set map Tempest_V3" [y:2/6(9), n:0/6(8)] (25s remaining)

        const groups = text.match(voteRegex)!.groups!;

        const maxYesVotes = parseInt(groups.requiredYesVotes) || parseInt(groups.maxYesVotes);
        const maxNoVotes = parseInt(groups.requiredNoVotes) || parseInt(groups.maxNoVotes);

        return {
            title: groups.command,
            yesVotes: parseInt(groups.yesVotes),
            noVotes: parseInt(groups.noVotes),
            maxVotes: Math.max(maxYesVotes, maxNoVotes),
        };
    }
}
