// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// A mission archive's modinfo.lua, read without running it. Only the one shape a mutator needs is accepted:
// `return { key = value, ... }` with literal values. Anything else is refused rather than guessed at, so the
// client never builds a start script from a value the engine would read differently.

import luaparse from "luaparse";
import type { Expression, TableConstructorExpression } from "luaparse";

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

// The game name the engine gives the archive, and so the one a start script names it by.
export function archiveGameName({ name, version }: ModInfo) {
    return `${name} ${version}`;
}
