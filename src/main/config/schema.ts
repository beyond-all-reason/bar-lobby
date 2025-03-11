import { z } from "zod";

/**
 * Configuration schema for the application
 * This defines the structure and validation rules for all configurable parameters
 */

// Content sources schema
export const ContentSourcesSchema = z
    .object({
        rapid: z
            .object({
                host: z.string().url(),
                game: z.string(),
            })
            .passthrough(),
        gameGithub: z
            .object({
                owner: z.string(),
                repo: z.string(),
            })
            .passthrough(),
        api: z
            .object({
                baseUrl: z.string().url(),
                findEndpoint: z.string(),
            })
            .passthrough(),
    })
    .passthrough(); // Allow unknown properties for forward compatibility

// Version defaults schema
export const VersionDefaultsSchema = z
    .object({
        latestEngineVersion: z.string(),
        latestGameVersion: z.string(),
    })
    .passthrough(); // Allow unknown properties for forward compatibility

// Server configuration schema
export const ServerConfigSchema = z
    .object({
        teiserver: z
            .object({
                host: z.string().url(),
                port: z.number().int().positive(),
            })
            .passthrough(),
        masterServer: z
            .object({
                url: z.string().url(),
                configEndpoint: z.string(),
            })
            .passthrough(),
    })
    .passthrough(); // Allow unknown properties for forward compatibility

// Main configuration schema that includes all sub-schemas
export const ConfigSchema = z
    .object({
        // Schema version for compatibility checks
        schemaVersion: z.string().optional().default("1.0.0"),
        contentSources: ContentSourcesSchema,
        versionDefaults: VersionDefaultsSchema,
        serverConfig: ServerConfigSchema,
    })
    .passthrough(); // Allow unknown properties for forward compatibility

// TypeScript types derived from the schemas
export type ContentSources = import("zod").infer<typeof ContentSourcesSchema>;
export type VersionDefaults = import("zod").infer<typeof VersionDefaultsSchema>;
export type ServerConfig = import("zod").infer<typeof ServerConfigSchema>;
export type Config = import("zod").infer<typeof ConfigSchema>;

// Default configuration values
export const defaultConfig: Config = {
    schemaVersion: "development", // This will be replaced during the build process
    contentSources: {
        rapid: {
            host: "repos-cdn.beyondallreason.dev",
            game: "byar",
        },
        gameGithub: {
            owner: "beyond-all-reason",
            repo: "Beyond-All-Reason",
        },
        api: {
            baseUrl: "https://files-cdn.beyondallreason.dev",
            findEndpoint: "/find",
        },
    },
    versionDefaults: {
        latestEngineVersion: "2025.01.3",
        latestGameVersion: "byar:test",
    },
    serverConfig: {
        teiserver: {
            host: "server.beyondallreason.dev",
            port: 8200,
        },
        masterServer: {
            url: "https://config.beyondallreason.dev",
            configEndpoint: "/config.json",
        },
    },
};

/**
 * Get the JSON schema for documentation purposes
 * This requires the zod-to-json-schema package to be installed
 */
export async function getJsonSchema() {
    try {
        // Dynamic import to avoid requiring this package in production
        const zodToJsonSchema = await import("zod-to-json-schema").then((m) => m.zodToJsonSchema);
        return zodToJsonSchema(ConfigSchema, "Config");
    } catch (error) {
        console.error("Failed to generate JSON schema:", error);
        return null;
    }
}
