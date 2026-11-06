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

The client loads it only in dev mode, with a warning. Outside dev mode it is reported as an error and left out. `validate-content` also reports it as an error, so it cannot ship as official content by accident. Pass `--allow-dev` to check content still in development. Replace `"dev"` with the tested pairs before release.

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

## Format versions

`campaignConfig.json` and mission manifests may set `formatVersion`, which defaults to 1. A breaking change to the content format raises the version and changes these schemas with it. A client that only supports an older version reports the content as needing a newer client, instead of misreading it.
