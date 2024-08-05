# Situation at hand
Currently, there is only the lobby system without any matchmaking in place. This allows for total freedom when it comes to the setup of games but is, from a UI perspective, unnecessarily complicated for the vast majority of actual matches.
It also leads to a lot of frustration, especially among high-level players who end up in matches with a huge skill disparity while being locked out of many lobbies because of a max-skill setting, which is a perfectly reasonable thing to have, in general.
Another effect is the coalescing of lobbies towards 8v8, even if the players would prefer smaller games (explanation omitted for brevity reasons).

A solution for this is matchmaking where people by default just queue up for a game mode and are automatically matched with people of equal skill level. This will prevent the aforementioned lobby problem as well as the problem of skill disparity.
However, it will have the effect of players of high skill level having to expect longer queue times. Also, every game mode creates a player segment, effectively dividing the number of available (i.e. currently queueing) players by the number of different game modes that matchmaking is being provided for.

If we enable multi-queueing, we will run into the problem of the game modes with the lower requirements for matchmaking cannibalising the player base for the "more difficult" play modes, even if they are the preferred ones.
Given the side effect that in order to get a match at all in some reasonable time frame, players get incentivised to multi-queue themselves, this effect gets further amplified.
We have a tiny player base so every segregation of the player base has a huge impact on queue times and matchmaking quality.

# Suggestions for moving forward
* We don't enable multi-queueing
* We start with a limited set of game modes for matchmaking (suggestion: 1v1, 2v2, 3v3, 4v4, 8v8). Everything else is expected to be done using a custom lobby.
* We add information to the ui stating the number of online players, players currently in a game and players being queued up currently, so people can get a feeling for what to expect. We add the same "# of players in queue" for each of the matchmaking modes to have some expectation management with regard to the queue time and matchmaking quality.
* We keep a close eye on the queue size trends and gather continuous feedback of the community regarding the available play modes to remove those that people don't use or add ones that people ask for while making sure the ratio between available matchmaking modes and player base size is always at a reasonable level.

# Matchmaking Process
1. Select a game mode (1v1/2v2/...)
2. Hit the queue button
4. The matchmaker chooses a suitable opponent and picks a selection of three maps from the map pool
5. Each player/team is shown a screen with their opponent(s), their chosen faction(s) and the three pre-selected maps.
6. Each player/team can veto one of the maps. The remaining one is used for the match. If both players/teams vetoed the same map, one of the other two will be chosen at random.
8. You play the match. Cancelling out because you don't like the map, the opponent(s), or your team mates is not expected to happen.

Hints:
- There is a map pool of maps (like 8-10) the matchmaker can choose from. The pool changes per season to have some variety. You can inspect the map pool for the current season.
- I guess there will also be some kind of possibility to block a player, so you don't get them on your team, although such a feature could, if widely used, lead to long queue times because there is no combination of people any more that would be willing to play together.
- These are just my thoughts - we are only somewhat discussing how matchmaking could or should work as I am sketching out ideas on how it could look like on the UI in the end.