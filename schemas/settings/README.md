<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

# Settings list JSON Schema (proposal)

**Status: proposal, for the engine and game teams to review.** This folder will hold the schema itself, `settings-list.schema.json`, once the format is agreed. Until then this document is the format.

The lobby client shows the player the game's settings, keeps the ones they change, and syncs them between their machines. To do that it needs to know, for each engine and game version, which settings exist, what values each takes, how to name it to the player and where it belongs. Today it finds out by running the engine at the player's end, and by copying the game's options menu into the client by hand.

This proposal replaces both with a file that the engine and the game each produce in their build, one per version, so everything is known before it reaches the player. A version without a file shows "No settings available to be changed".

## The files

|            | Engine                                                     | Game                                                 |
| ---------- | ---------------------------------------------------------- | ---------------------------------------------------- |
| Lists      | every config variable, as `--list-config-vars` prints them | the settings the game offers the player in its menu  |
| Where      | `settings/settings-list.json` in the engine's folder       | to be decided, see [Open questions](#open-questions) |
| Text       | `settings/language/<locale>.json` beside it                | beside it, in the same way                           |
| Built from | the engine's config variable declarations                  | the game's options menu (`gui_options.lua`)          |

Both use the same schema. Only the settings stored in `springsettings.cfg` are in scope. Settings the game keeps elsewhere, such as widget options and keybinds, come later, and options that set several keys, or write something other than the value chosen, are left out for now.

## Example

A game's file, shortened. The translation keys here are placeholders.

```json
{
    "$schema": "https://raw.githubusercontent.com/beyond-all-reason/bar-lobby/master/schemas/settings/settings-list.schema.json",
    "formatVersion": 1,
    "source": "game",
    "version": "Beyond All Reason test-31001-1a2b3c4",
    "settings": [
        {
            "key": "ShadowQuality",
            "type": "enum",
            "options": [
                { "value": "0", "label": "settings.options.off" },
                { "value": "1", "label": "settings.options.lowest" },
                { "value": "2", "label": "settings.options.low" },
                { "value": "3", "label": "settings.options.medium" },
                { "value": "4", "label": "settings.options.high" },
                { "value": "5", "label": "settings.options.ultra" }
            ],
            "default": "3",
            "label": "settings.shadowQuality",
            "description": "settings.shadowQualityDescription",
            "group": "gfx",
            "category": "basic",
            "scope": "device"
        },
        {
            "key": "ui_scale",
            "type": "float",
            "min": 0.8,
            "max": 1.3,
            "step": 0.01,
            "default": 1,
            "label": "settings.uiScale",
            "group": "ui",
            "category": "basic"
        },
        {
            "key": "HideSpecChat",
            "type": "bool",
            "default": false,
            "label": "settings.hideSpecChat",
            "description": "settings.hideSpecChatDescription",
            "group": "ui",
            "category": "basic"
        },
        { "key": "snd_volbattle", "scope": "game" }
    ]
}
```

An engine's file has the same shape, with `"source": "engine"` and the engine's version. Its entries have no group or category; see [Group and category](#group-and-category).

```json
{ "key": "MaxSounds", "type": "int", "min": 1, "default": 128, "description": "MaxSounds.description", "scope": "device" }
```

## The file

| Field           | Required | Meaning                                                                                                                                |
| --------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `formatVersion` | yes      | `1`. Raised on a breaking change; a client that only reads older versions shows no settings rather than misreading them.               |
| `source`        | yes      | `"engine"` or `"game"`.                                                                                                                |
| `version`       | yes      | The engine or game version the file belongs to, exactly as the client knows it. The client ignores a file whose version doesn't match. |
| `settings`      | yes      | The settings, in the order the player sees them. Each key at most once.                                                                |

## A setting

The six things every setting describes:

### 1. Key

`key`: the name in `springsettings.cfg`, matched exactly, case included. No `=`, `#`, line breaks, or spaces at either end, since the file can't hold them.

### 2. Type and range

`type` is one of:

| `type`   | Value             | Also takes           | Written to `springsettings.cfg` as   |
| -------- | ----------------- | -------------------- | ------------------------------------ |
| `bool`   | `true` or `false` |                      | `1` or `0`                           |
| `int`    | a whole number    | `min`, `max`, `step` | the number                           |
| `float`  | a number          | `min`, `max`, `step` | the number, in plain decimal         |
| `string` | text, on one line |                      | the text                             |
| `enum`   | one of `options`  | `options` (required) | the chosen option's `value`, exactly |

- `min` and `max` are inclusive, and either may be left out. The client offers a slider when both are given and a number box otherwise.
- `step` is the smallest change the player can make, from `min`. For an `int` it defaults to 1. `max - min` must be a whole number of steps, so `max` is a value the player can actually pick.
- Each of an `enum`'s `options` has a `value`, the exact text written, and a `label`, a translation key. The game's menu writes some lists as the option's position, `"0"`, `"1"` and so on; write those out as such.

The client picks the control from the type and range. The schema says what values are allowed, not how they are shown.

### 3. Name and description

`label` and `description` are translation keys, looked up in the `language/<locale>.json` files beside the settings list. Those are JSON objects of text, nested or with dotted keys, the same as content's [language files](../content/README.md). Every language falls back to English, and a key without English text shows as the key itself.

- `label` is the setting's name. Required for a setting in the basic or advanced category. Without one, the client shows the setting's key.
- `description` is optional: one line, shown below or beside the name.

The engine has no translations of its own, so its build can write `language/en.json` from the descriptions it already declares, keyed `<Key>.description`. They can be translated later without changing the format.

### 4. Default

`default`: the value in effect when `springsettings.cfg` has no line for the key. It has the setting's type, and for an `enum` it is one of its options' values. It is required, except in a `game` entry.

`springsettings.cfg` doesn't list every setting. It holds only the keys that are set to something other than their default. Two things write it:

- **The client**, before each launch. It writes the keys the player has changed from their default, and removes a key the player sets back to its default.
- **The engine**, while it runs. It writes the file straight away each time a value is set, whether by the engine itself or by the game's Lua (`Spring.SetConfigInt` and the like). That covers the player changing an option in the game's own menu, and the game setting its `game`-scoped keys. Setting a key to its default removes the line instead of writing it. A value the game sets with `useOverlay` lasts only for that run and isn't written.

When the engine starts, it also cleans the file up. It removes every line that holds the key's default, and every deprecated key.

So a key has no line when nobody has changed it, or when it was set back to its default, and then the engine and the game read `default`. A player can keep lines that hold the default by turning on the engine's `StoreDefaultSettings`. Such a line has the same effect as no line, and the client treats it as unchanged.

`default` is the engine's or the game's own fallback, without anything the client adds:

- For an engine variable, it is the engine's declared default.
- For a key only the game reads, it is the fallback the game's Lua passes when it reads the key, as in `Spring.GetConfigInt(key, fallback)`.
- For an engine variable the game also reads, it is the engine's default. The engine gives its default to anything that reads the key, so a fallback the game passes is never used. The game's file must give the same default as the engine's.

The client also puts a config file of its own beneath `springsettings.cfg`. The engine reads that file's values as defaults, and checks against them when it removes lines that hold the default. They are the client's choice, not the engine's or the game's, so they don't go in `default`.

### 5. Group and category

These sort a setting the way the game's own options menu does.

- `group`, the menu's tab: `gfx`, `ui`, `game`, `control`, `sound`, `notif`, `accessibility`, `custom` or `dev`.
- `category`: `basic` (always shown), `advanced` (shown to everyone, collapsed until opened) or `dev` (only in the client's dev mode).

The game decides which settings the player sees, so the engine's entries leave both out: every engine variable is `dev`, under no group, unless the game's file lists it too.

### 6. Scope

`scope` says whose setting it is:

| `scope`  | Meaning                                                                               | Client                                                                   |
| -------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `user`   | The player's choice. The default.                                                     | Kept with the player's settings, synced across their machines.           |
| `device` | Belongs to this machine: its display, its GPU's limits, its sound device.             | Kept on this machine, never synced.                                      |
| `game`   | Written by the game for itself, during play or on every launch, so it isn't a choice. | Not kept, not shown and not synced; the game's last value is left alone. |

A `game` entry needs only `key` and `scope`. A key in neither file is treated as `user`, so a setting nobody listed still follows the player.

Today the client keeps its own lists for these. With the files it would use theirs:

- device: display, window, graphics quality and sound device keys, such as `XResolution`, `Shadow*`, `MSAA*` and `snd_device`;
- game: `snd_volbattle`, `music_loadscreen_track` and the four `MouseDrag*Threshold` keys BAR recomputes from the resolution.

## Also needed by the client

Besides the six above:

- `deprecated: true`, from the engine: the key is on its way out. The engine deletes it from `springsettings.cfg` on every start, and the game's Lua can't set it. The client stops offering it, but keeps a value the player already set so it can still be reset.
- `readOnly: true`, from the engine: the game's Lua can't set the key. The engine only reads it from the file when it starts. The client doesn't offer it.

## When both files list a key

The game's entry is used, since it is what the player sees in the game: its range, step, default, name, group, category and scope. `deprecated` and `readOnly` still come from the engine. A key only in the game's file is one only the game's Lua reads, which is fine.

The game's range may be narrower than the engine's, but not wider. The engine clamps a value outside its own range when the value is read, so a wider range would offer values that never take effect. The game's default must equal the engine's, since the engine's is the one that applies (see [Default](#4-default)).

## What the schema doesn't check

A JSON Schema can't express everything. The validator, which both builds should run, also checks:

- No key is listed twice.
- `min` ≤ `default` ≤ `max`, and `default` is a whole number of steps from `min`.
- `max - min` is a whole number of steps, allowing for floating-point error.
- An `enum`'s `default` is one of its options, and no two options share a value.
- Every `label` and `description` key, and every option's `label`, has English text.

And, with both files at hand:

- The game's range for a key the engine also lists lies within the engine's, and its default equals the engine's.

## Open questions

1. **Where the game's file lives.** The game comes as a rapid package, an index and a pool of compressed files, so the client can't open a file inside it the way it can in the engine's folder. It could be published beside the package, for example in the rapid repository or as a release asset, and fetched by version before the game is even downloaded. Or the client could learn to read one file out of a package.
2. **Restart.** Should a setting say that it only takes effect after a restart? The client launches the game fresh each time, so this only matters for a change made in the game's own menu.
3. **One schema or two.** This proposal uses one for both, since the entries are the same apart from group and category. Two would let each be stricter.
4. **Translation keys.** Should the game's file use the keys its own menu already uses, so the text is shared, or keys of its own?
