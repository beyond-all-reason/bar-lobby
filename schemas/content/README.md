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
- Every mission named in `startMission`, `finalMission`, unlocks, removes and prerequisites is in `missions`, and every mission is reachable from `startMission`.
- No mission is called `shared`, and every mission folder is listed in `missions`.
- The `entryPoint`, mission configs, `backgroundImage` and `logo` exist, and stay inside their folder. Campaign images, including each mission's `image` and `backgroundImage`, are looked up in the campaign's `shared/media/`. A scenario's or tutorial's are looked up in its own `media/`.
- In a mission config, `playerTeam` and `teamSettings` name teams in `alliances`, `allianceSettings` and `alliedWith` name alliances, and no team is in two alliances.
- Every language key (`titleKey`, `descriptionKey` and a team's `displayNameKey`) has English text where the client looks it up: a campaign's in `shared/language/en.json`, a campaign mission's in its own `language/en.json` and then the campaign's, a scenario's or tutorial's in its own. Every language falls back to English, so a key without it shows as the key itself. This is a warning.
- `compatibility` is required in a scenario or tutorial manifest, and `"dev"` loads only in dev mode. A campaign mission leaves it out and uses the campaign's. No engine is listed twice.

Run all of these over a content folder with the loader itself:

```sh
npm run validate-content -- <content root>
```

Add `--allow-dev` to accept content still in development (see [Content still in development](#content-still-in-development)). Add `--bundle <bundle.json>` to also check that every item runs on an engine and game a build ships with. The bundle file uses the same shape as `compatibility`:

```json
{ "bundled": [{ "engineVersion": "2025.04.10", "gameVersions": ["Beyond All Reason test-28000-aaaaaaa"] }] }
```

## Compatibility

Every campaign, scenario and tutorial lists the engine and game pairs it has been tested with. Each entry pairs one engine with the games that work on it, and only those pairs count:

```json
"compatibility": [
    { "engineVersion": "A", "gameVersions": ["1", "2", "3"] },
    { "engineVersion": "B", "gameVersions": ["2", "3", "4"] }
]
```

Here engine A with game 4 is not a valid pair. Versions are exact. Wildcards and rapid tags such as `byar:test` are refused, because a tag points at a different version over time.

### Content still in development

Content made in the mission editor runs on unreleased game code, so it has no released pair to name yet. Give `"compatibility": "dev"` instead, in `campaignConfig.json` or a scenario or tutorial manifest:

```json
"compatibility": "dev"
```

The client loads it only in dev mode, with a warning. Outside dev mode it is reported as an error and left out. `validate-content` also reports it as an error, so it cannot ship as official content by accident. Pass `--allow-dev` to check content still in development, and `--bundle` then passes over it. Replace `"dev"` with the tested pairs before release.

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

### Ids are permanent

Saved progress is keyed by campaign id and records mission ids. Once content is released, renaming a campaign or mission id loses players' progress for it.

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

A mission can report `null` for a variable to delete it. Names are 1 to 128 characters, values are strings of up to 4096 characters, numbers or booleans, and a campaign can hold at most 256 variables at once. A result that breaks these limits is refused and not saved.

## Format versions

`campaignConfig.json` and mission manifests may set `formatVersion`, which defaults to 1. A breaking change to the content format raises the version and changes these schemas with it. A client that only supports an older version reports the content as needing a newer client, instead of misreading it.

## Trying content in the client

Point the client at a content folder from `npm start`. These variables have no effect in a packaged build.

```sh
# Official content needs a Steam build as well as the folder.
BAR_EDITION=steam BAR_CONTENT_PATH=tests/fixtures/content npm start
# Custom content works in every edition.
BAR_CUSTOM_CONTENT_PATH=tests/fixtures/content-custom npm start
```

Then run `await window.singleplayer.list()` in DevTools to see what loaded and any problems.
