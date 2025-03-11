import fs from "fs";
import path from "path";
import { zodToJsonSchema } from "zod-to-json-schema";
import { ConfigSchema } from "../src/main/config/schema";

// Generate JSON schema from Zod schema
const jsonSchema = zodToJsonSchema(ConfigSchema, "Config");

// Write schema to file
const outputPath = path.join(__dirname, "../schema/config.schema.json");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(jsonSchema, null, 2));

console.log(`JSON schema generated at ${outputPath}`);
