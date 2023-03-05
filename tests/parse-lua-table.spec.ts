/* eslint-disable no-restricted-imports */

import { parseLuaTable } from "../src/renderer/utils/parse-lua-table";

const table = `
local table = {
	integer = 5,
	string = "i am a string",
	float = 1.5,
	boolean = true,
	object = {
		name = "test",
		age = 20
	},
	array = { 1, 2, "three", },
	arrayOfObjects = {
		{
			name = "test",
			age = 20
		},
		{
			name = "thing",
			age = 30,
		},
	},
	emptyTable = {},
	zero = 0,
	emptyString = "",
	falsey = false
}
return table
`;

test("scenario 1", async () => {
    const data = parseLuaTable(Buffer.from(table));

    expect(data.integer).toEqual(5);
    expect(data.string).toEqual("i am a string");
    expect(data.float).toEqual(1.5);
    expect(data.boolean).toEqual(true);
    expect(data.object).toEqual({ name: "test", age: 20 });
    expect(data.array).toEqual([1, 2, "three"]);
    expect(data.arrayOfObjects).toEqual([
        { name: "test", age: 20 },
        { name: "thing", age: 30 },
    ]);
    expect(data.emptyTable).toEqual({});
    expect(data.zero).toEqual(0);
    expect(data.emptyString).toEqual("");
    expect(data.falsey).toEqual(false);
});
