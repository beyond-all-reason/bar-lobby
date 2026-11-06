// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { TSchema, Static } from "@sinclair/typebox";
import type { ErrorObject, ValidateFunction } from "ajv";
import Ajv2020 from "ajv/dist/2020";
import { SUPPORTED_FORMAT_VERSION } from "../../../shared/content/schema/common";
import type { Problems } from "./problems";

// No coercion and no defaults: content is read exactly as written, so what passes here passes in any other
// JSON Schema validator given the exported schemas.
const ajv = new Ajv2020({ strict: true, allErrors: true, verbose: true });
const validators = new WeakMap<TSchema, ValidateFunction>();

function validatorFor(schema: TSchema) {
    let validate = validators.get(schema);
    if (!validate) {
        validate = ajv.compile(schema);
        validators.set(schema, validate);
    }

    return validate;
}

export function describeError(error: ErrorObject) {
    const where = error.instancePath || "(root)";
    const got = error.keyword === "required" ? "" : error.keyword === "additionalProperties" ? ` (got ${JSON.stringify(error.params.additionalProperty)})` : ` (got ${JSON.stringify(error.data)})`;
    // A pattern on its own tells an author nothing, so the field's own description says what was wanted. A key
    // that misses a pattern-keyed object's pattern is the same mistake.
    const patterned = error.keyword === "pattern" || (error.keyword === "additionalProperties" && error.parentSchema?.patternProperties);
    const hint = patterned && error.parentSchema?.description ? `. ${error.parentSchema.description}` : "";
    const expected =
        error.keyword === "const"
            ? `. Expected ${JSON.stringify(error.params.allowedValue)}`
            : error.keyword === "enum"
              ? `. Expected one of ${error.params.allowedValues.map((value: unknown) => JSON.stringify(value)).join(", ")}`
              : "";

    return `${where} ${error.message}${got}${hint}${expected}`;
}

/**
 * Ajv reports why every branch of a failed anyOf failed. A branch the value is not even the type of was never
 * the one meant, so while some branch does match its type, only that branch's errors are kept: a bad list of
 * engine and game pairs is not also told it should have been the string "dev".
 */
export function relevantErrors(errors: readonly ErrorObject[]): ErrorObject[] {
    const dropped = new Set<ErrorObject>();
    for (const anyOf of errors.filter((error) => error.keyword === "anyOf")) {
        const branches = new Map<string, ErrorObject[]>();
        for (const error of errors.filter((error) => error.schemaPath.startsWith(`${anyOf.schemaPath}/`))) {
            const branch = error.schemaPath.slice(anyOf.schemaPath.length + 1).split("/")[0];
            branches.set(branch, [...(branches.get(branch) ?? []), error]);
        }
        const wrongType = [...branches.values()].filter((branchErrors) => branchErrors.some((error) => error.keyword === "type" && error.instancePath === anyOf.instancePath));
        if (wrongType.length < branches.size) {
            wrongType.flat().forEach((error) => dropped.add(error));
            dropped.add(anyOf);
        }
    }

    return errors.filter((error) => !dropped.has(error));
}

// Hidden entries are skipped everywhere, so a content repo can be cloned straight into a content root.
export function isHidden(name: string) {
    return name.startsWith(".");
}

/**
 * The entries of a folder, skipping hidden ones. A folder that doesn't exist has nothing in it. One that exists
 * but can't be read is reported, so the content in it doesn't go missing without a word.
 */
export async function readFolder(folder: string, problems: Problems): Promise<Dirent[]> {
    try {
        return (await fs.readdir(folder, { withFileTypes: true })).filter((entry) => !isHidden(entry.name));
    } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code === "ENOTDIR") {
            problems.error(folder, "Expected a folder, but this is a file");
        } else if (code !== "ENOENT") {
            problems.error(folder, `Folder cannot be read (${code ?? (err instanceof Error ? err.message : String(err))}), so nothing in it is loaded`);
        }
        return [];
    }
}

export async function listFolders(folder: string, problems: Problems): Promise<string[]> {
    return (await readFolder(folder, problems)).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

/**
 * Each name that differs from another only in case, with the names it collides with. Such names are one folder
 * on Windows, so content that relies on them breaks there.
 */
export function caseCollisions(names: readonly string[]): Map<string, string[]> {
    const byLowerCase = new Map<string, string[]>();
    for (const name of names) {
        byLowerCase.set(name.toLowerCase(), [...(byLowerCase.get(name.toLowerCase()) ?? []), name]);
    }
    const collisions = new Map<string, string[]>();
    for (const group of byLowerCase.values()) {
        for (const name of group.length > 1 ? group : []) {
            collisions.set(
                name,
                group.filter((other) => other !== name)
            );
        }
    }

    return collisions;
}

export async function isFile(filePath: string) {
    try {
        return (await fs.stat(filePath)).isFile();
    } catch {
        return false;
    }
}

export async function isFolder(folderPath: string) {
    try {
        return (await fs.stat(folderPath)).isDirectory();
    } catch {
        return false;
    }
}

function isInside(folder: string, target: string) {
    const relative = path.relative(folder, target);

    return relative !== "" && relative.split(path.sep)[0] !== ".." && !path.isAbsolute(relative);
}

/**
 * A file named by content, which must exist and stay inside `folder`, links included. Reports why not and
 * gives undefined otherwise.
 */
export async function fileInside(folder: string, relative: string, problems: Problems, reportAt: string, what: string): Promise<string | undefined> {
    const target = path.resolve(folder, relative);
    if (!isInside(folder, target)) {
        problems.error(reportAt, `${what} "${relative}" is outside ${folder}`);
        return undefined;
    }
    if (!(await isFile(target))) {
        problems.error(reportAt, `${what} "${relative}" does not exist`);
        return undefined;
    }
    const [realFolder, realTarget] = await Promise.all([fs.realpath(folder), fs.realpath(target)]);
    if (!isInside(realFolder, realTarget)) {
        problems.error(reportAt, `${what} "${relative}" links outside ${folder}`);
        return undefined;
    }

    return target;
}

async function readJsonValue(filePath: string, problems: Problems): Promise<{ value: unknown } | undefined> {
    let text: string;
    try {
        text = await fs.readFile(filePath, "utf8");
    } catch {
        problems.error(filePath, "File is missing or cannot be read");
        return undefined;
    }
    try {
        return { value: JSON.parse(text) };
    } catch (err) {
        problems.error(filePath, `Not valid JSON: ${err instanceof Error ? err.message : String(err)}`);
        return undefined;
    }
}

/**
 * Reads a content JSON file and checks it against its schema, reporting what is wrong with it. A file that
 * declares a newer `formatVersion` is reported as needing a newer client and not checked any further,
 * since this client does not know the rules it was written to.
 */
export async function readContentJson<T extends TSchema>(filePath: string, schema: T, problems: Problems): Promise<Static<T> | undefined> {
    const read = await readJsonValue(filePath, problems);
    if (!read) {
        return undefined;
    }

    const formatVersion = (read.value as { formatVersion?: unknown } | null)?.formatVersion;
    if (typeof formatVersion === "number" && formatVersion > SUPPORTED_FORMAT_VERSION) {
        problems.error(filePath, `Requires a newer client: format version ${formatVersion}, and this client supports up to ${SUPPORTED_FORMAT_VERSION}`);
        return undefined;
    }

    const validate = validatorFor(schema);
    if (!validate(read.value)) {
        for (const error of relevantErrors(validate.errors ?? [])) {
            problems.error(filePath, describeError(error));
        }
        return undefined;
    }

    return read.value as Static<T>;
}
