// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

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

function describeError(error: ErrorObject) {
    const where = error.instancePath || "(root)";
    const got = error.keyword === "required" || error.keyword === "additionalProperties" ? "" : ` (got ${JSON.stringify(error.data)})`;
    // A pattern on its own tells an author nothing, so the field's own description says what was wanted.
    const hint = error.keyword === "pattern" && error.parentSchema?.description ? `. ${error.parentSchema.description}` : "";

    return `${where} ${error.message}${got}${hint}`;
}

export function toBarUrl(filePath: string) {
    return `bar://${encodeURIComponent(filePath)}`;
}

// Hidden entries are skipped everywhere, so a content repo can be cloned straight into a content root.
export function isHidden(name: string) {
    return name.startsWith(".");
}

export async function listFolders(folder: string): Promise<string[]> {
    try {
        const entries = await fs.readdir(folder, { withFileTypes: true });

        return entries.filter((entry) => entry.isDirectory() && !isHidden(entry.name)).map((entry) => entry.name);
    } catch {
        return [];
    }
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
        for (const error of validate.errors ?? []) {
            problems.error(filePath, describeError(error));
        }
        return undefined;
    }

    return read.value as Static<T>;
}
