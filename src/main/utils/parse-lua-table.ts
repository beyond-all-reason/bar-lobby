/* eslint-disable @typescript-eslint/no-explicit-any */
import type { LocalStatement, ReturnStatement, TableConstructorExpression } from "luaparse";
import luaparse from "luaparse";

type ParseLuaTableOptions = {
    tableVariableName?: string;
};

export function parseLuaTable(luaFile: Buffer, options?: ParseLuaTableOptions): any {
    const parsedLua = luaparse.parse(luaFile.toString(), { comments: false });

    let tableConstructorExpression: TableConstructorExpression | undefined;
    if (options?.tableVariableName) {
        const localStatement = parsedLua.body.find((body) => body.type === "LocalStatement" && body.variables.find((variable) => variable.name === options?.tableVariableName)) as
            | LocalStatement
            | undefined;
        if (localStatement) {
            tableConstructorExpression = localStatement.init.find((obj) => obj.type === "TableConstructorExpression") as TableConstructorExpression | undefined;
        } else {
            throw new Error(`Could not find local statement for local table: ${options?.tableVariableName}`);
        }
    } else {
        const localStatement = parsedLua.body.find((body) => body.type === "LocalStatement") as LocalStatement | undefined;
        if (localStatement) {
            tableConstructorExpression = localStatement?.init.find((obj) => obj.type === "TableConstructorExpression") as TableConstructorExpression | undefined;
        } else {
            const returnStatement = parsedLua.body.find((body) => body.type === "ReturnStatement") as ReturnStatement | undefined;
            tableConstructorExpression = returnStatement?.arguments.find((obj) => obj.type === "TableConstructorExpression") as TableConstructorExpression | undefined;
        }
    }

    if (!tableConstructorExpression) {
        throw new Error("Could not find table");
    }

    return luaTableToObj(tableConstructorExpression);
}

function luaTableToObj(table: TableConstructorExpression): any {
    const blocks: any[] = [];
    const obj: Record<string, unknown> = {};

    for (const field of table.fields) {
        if (field.type === "TableKeyString") {
            const key = field.key.name;
            const value = field.value;
            if (value.type === "StringLiteral") {
                obj[key] = (value.value as string | null) ?? value.raw.slice(1, -1);
            } else if (value.type === "NumericLiteral" || value.type === "BooleanLiteral") {
                obj[key] = value.value;
            } else if (field.value.type === "TableConstructorExpression") {
                obj[key] = luaTableToObj(field.value);
            }
        } else if (field.type === "TableValue") {
            if (field.value.type === "TableConstructorExpression") {
                blocks.push(luaTableToObj(field.value));
            } else if (field.value.type === "StringLiteral") {
                blocks.push((field.value.value as string | null) ?? field.value.raw.slice(1, -1));
            } else if (field.value.type === "NumericLiteral" || field.value.type === "BooleanLiteral") {
                blocks.push(field.value.value);
            }
        }
    }

    return blocks.length > 0 ? blocks : obj;
}
