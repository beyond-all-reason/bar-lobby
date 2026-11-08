<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

# Singleplayer content JSON Schemas

These JSON Schemas describe the files in a singleplayer content folder: campaigns, scenarios and tutorials. They give you autocomplete, hover docs and errors while you edit content, in any editor or tool that reads JSON Schema.

Each file stands alone, with no references to the others, so you can copy just the one you need. They are generated from the definitions the lobby client itself validates with (`src/shared/content/schema/`) by `npm run generate-content-schemas`. Don't edit them by hand: CI fails when they differ from those definitions.

## Which schema applies to which file

| Schema                                                         | Content file                                                                               |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [`index-manifest.schema.json`](index-manifest.schema.json)     | `campaigns/manifest.json`, `scenarios/manifest.json`, `tutorials/manifest.json` (optional) |
| [`campaign-config.schema.json`](campaign-config.schema.json)   | `campaigns/<campaign>/campaignConfig.json`                                                 |
| [`credits.schema.json`](credits.schema.json)                   | `campaigns/<campaign>/credits.json`                                                        |
| [`mission-manifest.schema.json`](mission-manifest.schema.json) | `manifest.json` in a campaign mission, scenario or tutorial folder                         |
| [`mission-config.schema.json`](mission-config.schema.json)     | each mission config file named by a mission manifest's `config`                            |
| [`language-file.schema.json`](language-file.schema.json)       | `language/<locale>.json`, such as `en.json`, in a campaign's `shared/` or a mission folder |

Content files are strict JSON: no comments and no trailing commas.

## Using them in an editor

Either point a file at its schema with a `$schema` key. The client ignores this key.

```json
{
    "$schema": "../../schemas/content/campaign-config.schema.json",
    "campaignId": "sample-campaign"
}
```

Or map file names to schemas once, in VS Code's `settings.json`, without touching the content:

```json
{
    "json.schemas": [
        { "fileMatch": ["**/campaigns/*/campaignConfig.json"], "url": "./schemas/content/campaign-config.schema.json" },
        { "fileMatch": ["**/campaigns/*/credits.json"], "url": "./schemas/content/credits.schema.json" },
        { "fileMatch": ["**/campaigns/manifest.json", "**/scenarios/manifest.json", "**/tutorials/manifest.json"], "url": "./schemas/content/index-manifest.schema.json" },
        { "fileMatch": ["**/campaigns/*/*/manifest.json", "**/scenarios/*/manifest.json", "**/tutorials/*/manifest.json"], "url": "./schemas/content/mission-manifest.schema.json" },
        { "fileMatch": ["**/language/*.json"], "url": "./schemas/content/language-file.schema.json" }
    ]
}
```

Mission config files can have any name, so give each one a `$schema` key, or add a `fileMatch` that fits how you name them.

## Using them with a validator

They are draft 2020-12 schemas and work with any standard validator. For example:

- Ajv: `npx ajv-cli validate --spec=draft2020 -s campaign-config.schema.json -d "campaigns/*/campaignConfig.json"`
- [check-jsonschema](https://github.com/python-jsonschema/check-jsonschema): `check-jsonschema --schemafile campaign-config.schema.json campaigns/*/campaignConfig.json`, which also runs as a pre-commit hook

## What the schemas don't check

A JSON Schema sees one file at a time. These checks span files or need more than a schema can express, so only the client's loader makes them:

- A campaign's `campaignId` equals its folder name, and every key in `missions` equals a mission folder name and that mission's `missionId`. A scenario's or tutorial's `missionId` equals its folder name.
- Every mission named in `startMission`, `finalMission`, unlocks, removes and prerequisites is in `missions`. Every mission, and at least one `finalMission`, is reachable from `startMission`; this is a warning.
- No mission is called `shared`. Every mission folder is listed in `missions`; a folder that isn't is ignored, with a warning.
- No two campaign, scenario or tutorial ids differ only in case, and neither do two mission ids in one campaign, as they would be one folder on Windows. Items whose ids collide are left out, and so is a campaign whose mission ids do.
- The mission configs, `backgroundImage` and `logo` exist, and stay inside their folder. Campaign images, including each mission's `image` and `backgroundImage`, are looked up in the campaign's `shared/media/`. A scenario's or tutorial's are looked up in its own `media/`.
- In a mission config, `playerTeam` and `teamSettings` name teams in `alliances`, `allianceSettings` and `alliedWith` name alliances, and no team is in two alliances.
- Every language key (`titleKey`, `descriptionKey` and a team's `displayNameKey`) has English text where the client looks it up: a campaign's in `shared/language/en.json`, a campaign mission's in its own `language/en.json` and then the campaign's, a scenario's or tutorial's in its own. Every language falls back to English, so a key without it shows as the key itself. This is a warning.
- `compatibility` is required in a scenario or tutorial manifest, and `"dev"` loads only in dev mode. A campaign mission leaves it out and uses the campaign's. No engine is listed twice.
- `difficulties` and `defaultDifficulty` are required in a scenario or tutorial manifest, and `defaultDifficulty` is one of `difficulties`. A campaign mission leaves them out and uses the campaign's.

Run all of these over a content folder with the loader itself:

```sh
npm run validate-content -- <content root>
```

Add `--allow-dev` to accept content still in development (see [Content still in development](#content-still-in-development)).

Add `--bundle <assets folder>` to also check content against what an install ships. The folder's `engine/default.txt` and `games/default.txt` name the install's one engine and game, each holding only the version, as the Steam bundling writes them. Every item's `compatibility` must accept that pair, and its archive's `modinfo.lua` must name that game in `depend`. A missing or empty file is an error.

`--bundle` also checks that every scenario's, tutorial's and campaign mission's `mapName` is either in the folder's `maps/` or shipped with the content (see [Maps](#maps)).

The client's loader reads the maps content ships, so `validate-content`, with or without `--bundle`, and the client's content problems both warn about a campaign map kept in more than one place, a `.sdz` map, and a map whose name can't be read. The last two are ignored.

## Compatibility

Every campaign, scenario and tutorial lists the engine and game pairs it has been tested with. Each entry pairs one engine with the games that work on it, and only those pairs count:

```json
"compatibility": [
    { "engineVersion": "A", "gameVersions": ["1", "2", "3"] },
    { "engineVersion": "B", "gameVersions": ["2", "3", "4"] }
]
```

Here engine A with game 4 is not a valid pair. Versions are exact. Wildcards and rapid tags such as `byar:test` are refused, because a tag points at a different version over time.

Listing several pairs suits A/B testing and development, but expect to ship one. A campaign's, scenario's or tutorial's Lua is packaged as an `.sdz` archive (see [Mission archive](#mission-archive)), whose `modinfo.lua` names the one game it runs on in `depend`. Every pair listed here should name that game, or the archive won't run with it. The client checks that `depend` names at least one of the games listed here.

### Content still in development

Content made in the mission editor runs on unreleased game code, so it has no released pair to name yet. Give `"compatibility": "dev"` instead, in `campaignConfig.json` or a scenario or tutorial manifest:

```json
"compatibility": "dev"
```

The client loads it only in dev mode, with a warning. Outside dev mode it is reported as an error and left out. `validate-content` also reports it as an error, so it cannot ship as official content by accident. Pass `--allow-dev` to check content still in development, and `--bundle` then passes over it. Replace `"dev"` with the tested pairs before release.

## Mission archive

A campaign's, scenario's or tutorial's Lua ships as a mutator archive named `bar-<kind>-<id>.sdz`, in a `games` folder inside the item's own folder:

```
scenarios/outpost-strike/games/bar-scenario-outpost-strike.sdz
tutorials/movement/games/bar-tutorial-movement.sdz
campaigns/sample-campaign/games/bar-campaign-sample-campaign.sdz
```

The kind and id are in the name because archives with the same name shadow each other in the engine. When a mission is launched, the item's folder is added to the engine's data directories, and the engine finds the archive in its `games` folder.

The archive must open, and must hold:

- `modinfo.lua` at its root;
- for a scenario or tutorial, its mission's Lua at `<kind folder>/<id>/mission.lua`, such as `scenarios/outpost-strike/mission.lua`;
- for a campaign, each mission's Lua at `campaigns/<campaign id>/<mission id>/mission.lua`, such as `campaigns/sample-campaign/mission01/mission.lua`.

Case matters in these paths, as it does to the engine on Linux.

The client reads `modinfo.lua` without running it, so it must be a plain table of literal values: a single `return { ... }`, every field written as `key = value`, and every value a string, number, boolean or a table of those. Comments are fine. The client reads three fields:

- `name` must be the archive's file name without `.sdz`, such as `bar-scenario-outpost-strike`;
- `version` must be a non-empty string. Raise it with every release: the start script names the archive by `name` and `version`, such as `bar-scenario-outpost-strike 1.0`, so a replay of an older release isn't played with newer Lua. The client can't check that it went up, as it has no earlier release to compare with;
- `depend` must name at least one of the games in `compatibility`. This isn't checked for `"compatibility": "dev"`.

Anything else is an error, and the item is left out.

Until missions can be launched from the client, the archive is optional: an item without one loads as before. Once they can, an item without an archive will load with a warning that it cannot be launched.

## Maps

A mission is played on the map its manifest names in `mapName`, by the name the engine knows it by. That map either comes with the install, or ships with the content in a `maps/` folder:

| Content          | Where its own maps go                                                                                                                                           |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scenario         | `maps/` in its own folder, such as `scenarios/river-crossing/maps/`                                                                                             |
| Tutorial         | `maps/` in its own folder, such as `tutorials/movement/maps/`                                                                                                   |
| Campaign mission | the campaign's `shared/maps/` for a map several missions use; the mission's own `maps/`, such as `campaigns/<campaign>/mission01/maps/`, for a map only it uses |

- Maps are `.sd7` archives. The client reads only `.sd7`, and names each by its `mapinfo.lua`, not by its file name.
- A campaign keeps each map in one place. `validate-content` warns when the same map is in `shared/maps/` and a mission's `maps/`, or in more than one mission's `maps/`.
- Scenarios and tutorials have no shared folder, so a map several of them use ships once in each. A shared folder to avoid those copies would need a change to the content structure: a reserved folder beside the scenarios or tutorials, which the client would also add at launch.
- Once missions launch, the client finds these maps by adding the item's folder, and a campaign's `shared/`, as engine data directories. Until then, only `validate-content` reads them.

## Difficulty

The difficulties are the mission API's own set, from its `luarules/mission_api/difficulties.json`: `story`, `easy`, `medium` and `hard`. The client names them in the player's language and passes the chosen one to the mission by id. The mission decides what each one means.

`campaignConfig.json` and each scenario's or tutorial's manifest list the difficulties they offer, at least one, and the one chosen until the player picks another:

```json
"difficulties": ["easy", "medium", "hard"],
"defaultDifficulty": "medium"
```

The player chooses from the ones listed, which are shown easiest first whatever order they are listed in. A campaign's missions leave both out: the player chooses once for the whole campaign, and every mission is played at it. They can change it at any time, and the next mission is played at the new one.

The choice is kept in the player's saved progress. If a release stops offering the difficulty a player chose, they play at `defaultDifficulty` until they choose again. Starting a campaign over goes back to the default.

## Display order

Campaigns, scenarios and tutorials are shown in the order the `order` list in their folder's `manifest.json` gives, such as `scenarios/manifest.json`. Any not in that list come after, sorted by id one character code at a time. That puts uppercase before lowercase, and `Mission10` before `Mission2`.

A campaign's missions are shown in the order `missions` lists them, with one exception from how JavaScript orders an object's keys: a key that is a whole number written without leading zeros, such as `"1"` or `"42"`, comes before every other key, smallest first. `"01"` and `"Mission1"` are not whole numbers and keep their place.

By convention, ids are a name with a zero-padded number, such as `Mission01`, `Mission02` and so on, with enough digits for every mission. Ids like these keep their place in `missions` and also sort in the intended order.

## Ids are permanent

Saved progress is keyed by campaign id and records mission ids. Once content is released, renaming a campaign or mission id loses players' progress for it.

## Saved progress and changing a released campaign

### How progress is saved

The client saves where a player stands in a campaign, not the results that got them there. Each result is applied once, when the mission ends, under the campaign's rules at that moment, and only its effect is kept:

- which missions are unlocked, and which a result has removed
- how many times each mission has been won and lost
- the campaign's variables

A mission counts as completed once it has been won. What can be played now and whether the campaign is finished are worked out from the current `campaignConfig.json` each time, so a change to which missions are replayable or final applies at once.

This means a change to a released campaign's unlock rules never rewrites progress players already have. It applies from each player's next result. That makes it safe to restrict or rebalance a campaign, but a fix that should have applied to results already played doesn't reach players who played them.

When a player opens a campaign, the client fits their progress to the campaign as it is now, in two ways only:

- Missions the campaign no longer has are dropped.
- A mission whose `prerequisites` the player has already all won is unlocked, unless a result has removed it. This is the way to add a mission that existing players should get.

A removal sticks. A mission a result removes, whether it was unlocked yet or not, is never unlocked by its `prerequisites`. Only a later result that unlocks it brings it back.

### Changes that are safe without a new save version

- Adding a mission behind `prerequisites`. Players who have already won them get it the next time they open the campaign.
- Adding a mission to the unlocks of a mission players haven't played yet.
- Adding removals or prerequisites to missions that have already shipped, or changing what a branch unlocks or removes. Players keep what they have, and the new rules apply to their next results.
- Removing a mission. Nothing may still refer to it, which the loader checks.
- Changing `finalMission`, or whether missions are replayable.
- Anything that doesn't change unlocks: text, images, maps, mission configs, Lua, credits and `compatibility`.

### Changes that need a new save version, or another way to make them

These need players' past results to count differently, which their saved progress can't provide:

- **Adding an unlock to a mission players may already have played.** They won't get it, because that mission's result has already been applied. Gate the new mission with `prerequisites` instead, which existing players who meet them get.
- **Adding a start mission.** Existing players won't get it. Give it `prerequisites` that every player has won, if there are any.
- **Changing what a variable means,** or which mission is relied on to set it. Saved values keep their old meaning.
- **Any change that should undo or redo progress players already have,** such as giving back a mission an earlier rule wrongly removed.

### `saveVersion`

`campaignConfig.json` may set `saveVersion`, which defaults to 1. Raise it by one when a release makes a change from the list above that you can't make another way. Each save records the version it was started under, and the client then treats a save from another version as follows:

- **Older than the campaign:** the player's progress no longer counts. The campaign says it has been updated and offers to start over, which deletes the old save.
- **Newer than the campaign:** the save was made with a newer release of the campaign, for example on another computer. The client leaves it untouched and asks the player to update.

Limitations, which matter before deciding to raise it:

- **All or nothing.** Raising it discards every player's progress in the campaign, including what they had done that your change doesn't affect. Nothing carries over: completed missions, the branch they chose and every variable are lost. There is no migration and no "continue from chapter N".
- **Players have to replay from the start.** Tell them in the release notes before releasing a raised version.
- **The old progress is deleted** when the player starts over, and can't be restored by rolling the content back.
- **The client can't tell you that a version needs raising.** A change that needed one but didn't get it simply doesn't reach players who were past the point it changed.
- **Campaigns only.** Scenarios and tutorials have no save version. Their progress is only how many times each one has been won and lost, which content changes don't affect.

Prefer the safe changes above, and keep version raises for changes you can't make any other way.

### Variables in saved progress

Missions can report variables when they end, won or lost. Each reported value replaces the one before, across the whole campaign, and every mission receives the current values when it launches. Only the current values are kept, not the values each result reported.

Any mission can change any variable, so give each variable to one mission, for example by prefixing its name with the mission id, unless several missions are meant to share it. A replayable mission that sets a shared variable changes it for every mission played after it.

A mission can report `null` for a variable to delete it. Names are 1 to 128 characters, values are strings of up to 4096 characters, numbers or booleans, and a campaign can hold at most 256 variables at once.

All of a campaign's variables together must also fit in 61440 bytes (60 KiB), and so must the variables one result reports. They travel in a single Lua network message, which holds less than 64 KB. The size is counted as compact JSON in UTF-8, such as `{"mission01_choice":"left","mission01_score":1200}`, which counts the names, quotes and punctuation as well as the values. A character outside ASCII takes 2 to 4 bytes. This is the limit you will usually reach first: 256 variables of 4096 characters each would not fit.

A result that breaks any of these limits is refused and not saved.

## Format versions

`campaignConfig.json` and mission manifests may set `formatVersion`, which defaults to 1. A breaking change to the content format raises the version and changes these schemas with it. A client that only supports an older version reports the content as needing a newer client, instead of misreading it.

## Trying content in the client

Point the client at a content folder from `npm start`. These variables have no effect in a packaged build. There, a Steam build reads official content from the `content` folder in its assets folder, and every build reads custom content from the `content` folder in its state folder.

```sh
# Official content needs a Steam build as well as the folder.
BAR_EDITION=steam BAR_CONTENT_PATH=tests/fixtures/content npm start
# Custom content works in every edition.
BAR_CUSTOM_CONTENT_PATH=tests/fixtures/content-custom npm start
# The mission API team's example scenario, with its mission archive.
BAR_EDITION=steam BAR_CONTENT_PATH=tests/fixtures/content-sdz npm start
```

Then run `await window.singleplayer.list()` in DevTools to see what loaded and any problems.
