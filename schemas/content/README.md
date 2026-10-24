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
- `compatibility` is required in a scenario or tutorial manifest. A campaign mission leaves it out and uses the campaign's. No engine is listed twice.

Run all of these over a content folder with the loader itself:

```sh
npm run validate-content -- <content root>
```

Add `--bundle <bundle.json>` to also check that every item runs on an engine and game a build ships with. The bundle file uses the same shape as `compatibility`:

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

## Ids are permanent

Saved campaign progress is keyed by campaign id and records mission ids. Once content is released, renaming a campaign or mission id loses players' progress for it.

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
