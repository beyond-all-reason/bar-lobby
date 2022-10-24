/* eslint-disable @typescript-eslint/no-explicit-any */
import type { LocalStatement, TableConstructorExpression } from "luaparse";
import * as luaparse from "luaparse";

export function parseLuaTable(luaFile: Buffer, tableVariableName?: string): any {
    const parsedLua = luaparse.parse(luaFile.toString(), { encodingMode: "x-user-defined", comments: false });

    let tableConstructorExpression: TableConstructorExpression | undefined;
    if (tableVariableName) {
        const localStatement = parsedLua.body.find((body) => body.type === "LocalStatement" && body.variables.find((variable) => variable.name === tableVariableName)) as LocalStatement | undefined;
        if (localStatement) {
            tableConstructorExpression = localStatement.init.find((obj) => obj.type === "TableConstructorExpression") as TableConstructorExpression | undefined;
        } else {
            throw new Error(`Could not find local statement for local table: ${tableVariableName}`);
        }
    } else {
        const localStatement = parsedLua.body.find((body) => body.type === "LocalStatement") as LocalStatement | undefined;
        tableConstructorExpression = localStatement?.init.find((obj) => obj.type === "TableConstructorExpression") as TableConstructorExpression | undefined;
    }

    if (!tableConstructorExpression) {
        throw new Error("Could not find table");
    }

    return luaTableToObj(tableConstructorExpression);
}

export function luaTableToObj(table: TableConstructorExpression): any {
    const blocks: any[] = [];
    const obj: Record<string, unknown> = {};

    for (const field of table.fields) {
        if (field.type === "TableKeyString") {
            const key = field.key.name;
            if (field.value.type === "StringLiteral" || field.value.type === "NumericLiteral" || field.value.type === "BooleanLiteral") {
                obj[key] = field.value.value;
            } else if (field.value.type === "TableConstructorExpression") {
                obj[key] = luaTableToObj(field.value);
            }
        } else if (field.type === "TableValue") {
            if (field.value.type === "TableConstructorExpression") {
                blocks.push(luaTableToObj(field.value));
            }
        }
    }

    return blocks.length > 1 ? blocks : obj;
}
