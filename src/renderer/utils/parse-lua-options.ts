import { LuaOption, LuaOptionBoolean, LuaOptionList, LuaOptionNumber, LuaOptionSection, LuaOptionString } from "@/model/lua-options";
import { parseLuaTable } from "@/utils/parse-lua-table";

export function parseLuaOptions(lua: Buffer): LuaOptionSection[] {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const luaOptionsArray = parseLuaTable(lua) as Array<Record<string, any>>; // TODO: type this

    const miscSection: LuaOptionSection = {
        key: "nosection",
        name: "Misc Options",
        description: "Miscellaneous options",
        options: [],
        type: "section",
    };
    const sections: LuaOptionSection[] = [];

    for (const luaOptionObj of luaOptionsArray) {
        const baseOption: Omit<LuaOption, "type"> = {
            key: luaOptionObj.key,
            name: luaOptionObj.name,
            description: luaOptionObj.desc.replaceAll("\\n", "\n"),
            hidden: luaOptionObj.hidden ?? false,
        };

        if (luaOptionObj.type === "section") {
            const section: LuaOptionSection = {
                ...baseOption,
                type: "section",
                options: [],
            };
            sections.push(section);
            continue;
        }

        let section = sections.find((section) => section.key === luaOptionObj.section);
        if (!section) {
            section = miscSection;
        }

        if (luaOptionObj.type === "number") {
            const option: LuaOptionNumber = {
                ...baseOption,
                type: "number",
                default: luaOptionObj.def,
                step: luaOptionObj.step,
                min: luaOptionObj.min,
                max: luaOptionObj.max,
            };
            section.options.push(option);
        } else if (luaOptionObj.type === "boolean" || luaOptionObj.type === "bool") {
            const option: LuaOptionBoolean = {
                ...baseOption,
                type: "boolean",
                default: luaOptionObj.def,
            };
            section.options.push(option);
        } else if (luaOptionObj.type === "list") {
            const options: LuaOption[] = [];
            for (const option of luaOptionObj.items) {
                options.push({
                    type: "list",
                    key: option.key,
                    name: option.name,
                    description: option.desc.replaceAll("\\n", "\n"),
                    hidden: option.hidden,
                });
            }
            const option: LuaOptionList = {
                ...baseOption,
                type: "list",
                default: luaOptionObj.def,
                options,
            };
            section.options.push(option);
        } else if (luaOptionObj.type === "string") {
            const option: LuaOptionString = {
                ...baseOption,
                type: "string",
                default: luaOptionObj.def,
            };
            section.options.push(option);
        }
    }

    if (miscSection.options.length) {
        sections.push(miscSection);
    }

    return sections;
}
