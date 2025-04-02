/* eslint-disable @typescript-eslint/no-explicit-any */
import type { LocalStatement, ReturnStatement, TableConstructorExpression, Expression, BooleanLiteral, StringLiteral, UnaryExpression, BinaryExpression } from "luaparse";
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
            obj[key] = parseLuaAst(value);
        } else if (field.type === "TableValue") {
            blocks.push(parseLuaAst(field.value));
        }
    }
    return blocks.length > 0 ? blocks : obj;
}

function parseLuaAst(value: Expression) {
    switch (value.type) {
        case "BinaryExpression":
            return parseBinaryExpression(value as unknown as BinaryExpression);
        case "StringLiteral":
            if (value.value) return value;
            let rawString = value.raw.slice(1, -1);
            return rawString.replaceAll(/\x5c(\d+)/g, ""); //Some values have a color code embedded for the old chobby text coloring lets strip that out
        case "BooleanLiteral":
            return value.value;
        case "NumericLiteral":
            return value.value;
        case "UnaryExpression":
            return parseUnaryExpression(value);
        case "TableConstructorExpression":
            return luaTableToObj(value);
        default:
            console.log(value);
            break;
    }
}

function parseBinaryExpression(value: BinaryExpression): string {
    let left = parseLuaAst(value.left);
    let right = parseLuaAst(value.right);
    if (value.operator === "..") {
        return `${left}${right}`;
    }
    console.error("Unhandled binary expression operator");
    return "";
}

function parseUnaryExpression(value: UnaryExpression) {
    let expression = value as unknown as UnaryExpression;
    if (expression.operator === "-") return -parseLuaAst(expression.argument);
    if (expression.operator === "not") return !parseLuaAst(expression.argument);
    if (expression.operator === "#") return parseLuaAst(expression.argument).length;
    console.log("Unhandled Unary Expression Operator", expression);
}
