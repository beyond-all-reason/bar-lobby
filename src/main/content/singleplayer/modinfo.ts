// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// A mission archive's modinfo.lua, read without running it. Only the one shape a mutator needs is accepted:
// `return { key = value, ... }` with literal values. Anything else is refused rather than guessed at, so the
// client never builds a start script from a value the engine would read differently.

import luaparse from "luaparse";
import type { Expression, TableConstructorExpression } from "luaparse";
import { SCRIPT_VALUE_PATTERN, SCRIPT_VALUE_RULE } from "../../../shared/content/schema/common";

export type ModInfo = { name: string; version: string; depend: string[] };

export type ModInfoResult = { modInfo: ModInfo } | { error: string };

const PLAIN_TABLE = "modinfo.lua must be a plain table of literal values";

// The file is parsed byte by byte, one character each, so a string's value is decoded as UTF-8 here.
function stringOf(expression: Expression): string | undefined {
    return expression.type === "StringLiteral" && expression.value !== null ? Buffer.from(expression.value, "latin1").toString("utf8") : undefined;
}

function isLiteral(expression: Expression): boolean {
    switch (expression.type) {
        case "StringLiteral":
        case "NumericLiteral":
        case "BooleanLiteral":
        case "NilLiteral":
            return true;
        case "UnaryExpression":
            return expression.operator === "-" && expression.argument.type === "NumericLiteral";
        case "TableConstructorExpression":
            return expression.fields.every((field) => field.type !== "TableKey" && isLiteral(field.value));
        default:
            return false;
    }
}

function readTable(table: TableConstructorExpression): ModInfoResult {
    const fields = new Map<string, Expression>();
    for (const field of table.fields) {
        if (field.type !== "TableKeyString") {
            return { error: `${PLAIN_TABLE}; every field needs a name, as in \`name = "..."\`` };
        }
        if (!isLiteral(field.value)) {
            return { error: `${PLAIN_TABLE}; ${field.key.name} is not` };
        }
        fields.set(field.key.name, field.value);
    }

    const nameField = fields.get("name");
    const name = nameField && stringOf(nameField);
    if (!name) {
        return { error: "modinfo.lua must set name to a non-empty string" };
    }

    // Required by the client, not the engine: a mission replay finds its content by name and version, so each
    // release needs a version of its own.
    const versionField = fields.get("version");
    const version = versionField && stringOf(versionField);
    if (!version) {
        return { error: "modinfo.lua must set version to a non-empty string, and raise it with every release" };
    }
    // The version is half of the archive's name in the start script, under the same rule as content's strings there.
    if (!new RegExp(SCRIPT_VALUE_PATTERN).test(version)) {
        return { error: `modinfo.lua's version can't go in a start script. ${SCRIPT_VALUE_RULE}` };
    }

    const dependField = fields.get("depend");
    const depend: string[] = [];
    if (dependField) {
        if (dependField.type !== "TableConstructorExpression") {
            return { error: "modinfo.lua's depend must be a table of strings" };
        }
        for (const field of dependField.fields) {
            const game = field.type === "TableValue" ? stringOf(field.value) : undefined;
            if (game === undefined) {
                return { error: "modinfo.lua's depend must be a table of strings" };
            }
            depend.push(game);
        }
    }

    return { modInfo: { name, version, depend } };
}

export function readModInfo(lua: Buffer): ModInfoResult {
    let chunk;
    try {
        chunk = luaparse.parse(lua.toString("latin1"), { comments: false, encodingMode: "pseudo-latin1" });
    } catch (err) {
        return { error: `modinfo.lua could not be parsed: ${err instanceof Error ? err.message : String(err)}` };
    }

    const [statement, ...rest] = chunk.body;
    if (rest.length > 0 || statement?.type !== "ReturnStatement" || statement.arguments.length !== 1 || statement.arguments[0].type !== "TableConstructorExpression") {
        return { error: `${PLAIN_TABLE}, returned by its only statement` };
    }

    return readTable(statement.arguments[0]);
}

// Written back in the bytes readModInfo decodes, so a value comes back as it went in.
function luaString(value: string) {
    const escapes: Record<string, string> = { "\\": "\\\\", '"': '\\"', "\n": "\\n", "\r": "\\r" };

    return `"${Buffer.from(value, "utf8")
        .toString("latin1")
        .replace(/[\\"\n\r]/g, (char) => escapes[char])}"`;
}

// Parsing with `ranges: true` gives every node its start and end, which luaparse's types leave out.
type Ranged = Expression & { range: [number, number] };

/**
 * The same modinfo.lua with its name and depend replaced and everything else as written, for a dev launch on a
 * game the archive doesn't depend on. The file must be one readModInfo accepts.
 */
export function rewriteModInfo(lua: Buffer, { name, depend }: { name: string; depend: string[] }): Buffer {
    const source = lua.toString("latin1");
    const statement = luaparse.parse(source, { comments: false, encodingMode: "pseudo-latin1", ranges: true }).body[0];
    const table = statement?.type === "ReturnStatement" ? statement.arguments[0] : undefined;
    if (table?.type !== "TableConstructorExpression") {
        throw new Error(`${PLAIN_TABLE}, returned by its only statement`);
    }

    const values: Record<string, string> = { name: luaString(name), depend: `{ ${depend.map(luaString).join(", ")} }` };
    const edits = table.fields.flatMap((field) => (field.type === "TableKeyString" && field.key.name in values ? [{ range: (field.value as Ranged).range, text: values[field.key.name] }] : []));
    if (edits.length !== Object.keys(values).length) {
        throw new Error("modinfo.lua must set name and depend once each");
    }

    // From the end, so each range is still where it was parsed.
    const rewritten = edits.sort((a, b) => b.range[0] - a.range[0]).reduce((text, { range: [start, end], text: value }) => text.slice(0, start) + value + text.slice(end), source);

    return Buffer.from(rewritten, "latin1");
}

// The game name the engine gives the archive, and so the one a start script names it by. As RecoilEngine's
// ArchiveData constructor (ArchiveScanner.cpp) builds it: the version is left off when the name already
// contains it anywhere, and a start script's gametype must match the result exactly.
export function archiveGameName({ name, version }: ModInfo) {
    return version && !name.includes(version) ? `${name} ${version}` : name;
}
