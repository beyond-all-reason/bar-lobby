// SPDX-FileCopyrightText: 2023 Jazcash
// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT
// SPDX-FileAttributionText: Original code from https://github.com/beyond-all-reason/map-parser, heavily rewritten here

// The map name rule on its own, with no path aliases or 7-Zip, so tools/validate-content.ts can share it with
// the client's map scan.

import { LocalStatement, TableConstructorExpression, TableKey, TableKeyString, TableValue, parse } from "luaparse";
import type { MapInfo } from "./map-model";

// The name the engine and the client know a map by, from its mapinfo.lua and its file name without extension.
export function springNameFromMapInfo(rawMapinfo: string, fileName: string): string {
    const mapInfo = parseMapInfo(rawMapinfo);
    if (mapInfo && mapInfo?.name && mapInfo.version && !mapInfo.name.includes(mapInfo.version)) {
        return `${mapInfo.name} ${mapInfo.version}`;
    } else if (mapInfo?.name) {
        // missing/empty "version" field in mapinfo.lua. Don't append an
        // empty/undefined version here, or springName ends up with a trailing space
        // that never matches the expected spring name (map re-downloads every launch).
        return mapInfo.name;
    } else if (mapInfo.smtFileName) {
        return mapInfo.smtFileName;
    }

    return fileName;
}

function parseMapInfo(mapinfo: string): MapInfo {
    const parsedMapInfo = parse(mapinfo, { encodingMode: "x-user-defined", comments: false });
    const rootObj = parsedMapInfo.body[0] as LocalStatement;
    const rootTable = rootObj.init.find((block) => block.type === "TableConstructorExpression") as TableConstructorExpression;
    const obj = parseMapInfoFields(rootTable.fields);
    return obj as MapInfo;
}

function parseMapInfoFields(fields: (TableKey | TableKeyString | TableValue)[]) {
    const arr: any = [];
    const obj: any = {};
    for (const field of fields) {
        if (field.type === "TableKeyString") {
            if (field.value.type === "StringLiteral" || field.value.type === "NumericLiteral" || field.value.type === "BooleanLiteral") {
                obj[field.key.name] = field.value.value;
            } else if (field.value.type === "UnaryExpression" && field.value.argument.type === "NumericLiteral") {
                obj[field.key.name] = -field.value.argument.value;
            } else if (field.value.type === "TableConstructorExpression") {
                obj[field.key.name] = parseMapInfoFields(field.value.fields);
            }
        } else if (field.type === "TableValue") {
            if (field.value.type === "StringLiteral" || field.value.type === "NumericLiteral" || field.value.type === "BooleanLiteral") {
                const val = field.value.value;
                arr.push(val);
            }
        } else if (field.type === "TableKey") {
            if (field.value.type === "StringLiteral" || field.value.type === "NumericLiteral" || field.value.type === "BooleanLiteral") {
                if (field.key.type === "NumericLiteral") {
                    arr[field.key.type] = field.value.value;
                }
            } else if (field.value.type === "UnaryExpression" && field.value.argument.type === "NumericLiteral") {
                arr[field.key.type] = -field.value.argument.value;
            } else if (field.value.type === "TableConstructorExpression") {
                arr.push(parseMapInfoFields(field.value.fields));
            }
        }
    }
    if (arr.length) {
        return arr;
    }
    return obj;
}
