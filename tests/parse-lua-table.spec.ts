import { parseLuaTable } from "@main/utils/parse-lua-table";
import { expect, test } from "vitest";

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

const concat = `
local table = {
	string = "i am ".."a string",
	removeLuabinary = "No Rush Time".."\\255\\128\\128\\128".." [minutes]",
}
return table
`;

test("test lua string concat", async () => {
    const data = parseLuaTable(Buffer.from(concat));
    expect(data.string).toEqual("i am a string");
    expect(data.removeLuabinary).toEqual("No Rush Time [minutes]");
});

const looptest = `
local table = {
	op1 = "Option1",
}
for i = 2, 9 do
    table[#table + 1] = {
        key     = "tweakunits" .. i,
        name    = "Tweak Units " .. i,
        desc    = "A base64 encoded lua table of unit parameters to change.",
        section = "options_extra",
        type    = "string",
        def     = "",
        hidden 	= true,
    }
end
return table
`;
test("test lua string concat", async () => {
    const data = parseLuaTable(Buffer.from(looptest));
    //TODO fix variable assignments that modify the table
    console.log(data);
});
