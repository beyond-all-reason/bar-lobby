import fs from "fs";
import path from "path";
import axios from "axios";
import { app } from "electron";
import { logger } from "@main/utils/logger";
import { Config, ConfigSchema, defaultConfig } from "./schema";
import { parseArgs } from "node:util";

const log = logger("config-manager.ts");

/**
 * Configuration Manager
 * Handles loading, validating, and providing access to the application configuration
 */
export class ConfigManager {
    private config: Config = defaultConfig;
    private configPath: string;
    private remoteConfigUrl: string | null = null;

    constructor() {
        // Determine the config file path
        this.configPath = path.join(app.getPath("userData"), "config.json");

        // Parse command line arguments for config overrides
        const { values } = parseArgs({
            options: {
                "config-path": { type: "string" },
                "config-url": { type: "string" },
            },
        });

        if (values["config-path"]) {
            this.configPath = values["config-path"] as string;
        }

        if (values["config-url"]) {
            this.remoteConfigUrl = values["config-url"] as string;
        }
    }

    /**
     * Initialize the configuration
     * Loads from local file, remote URL, and applies command line overrides
     * @throws Error if a remote URL is specified but contains invalid configuration
     */
    public async initialize(): Promise<void> {
        try {
            // If a remote URL is specified (either via command line or environment),
            // prioritize loading from that URL
            if (this.remoteConfigUrl) {
                log.info(`Remote config URL specified: ${this.remoteConfigUrl}`);
                // This will throw if the remote config is invalid
                await this.loadRemoteConfig(this.remoteConfigUrl);
            }
            // Otherwise, try to load from the master server if configured
            else if (this.config.serverConfig?.masterServer?.url) {
                const remoteUrl = new URL(this.config.serverConfig.masterServer.configEndpoint, this.config.serverConfig.masterServer.url).toString();
                log.info(`Using master server config URL: ${remoteUrl}`);
                // This won't throw even if the master server config is invalid,
                // since it wasn't explicitly requested
                await this.loadRemoteConfig(remoteUrl);
            }
            // If no remote config is available or loading failed, fall back to local config
            else {
                log.info("No remote config URL specified, loading local config");
                await this.loadLocalConfig();
            }

            // Apply command line overrides (these take highest precedence)
            this.applyCommandLineOverrides();

            // Validate the final configuration
            this.validateConfig();

            log.info("Configuration initialized successfully");
        } catch (error) {
            const initError = error as Error;
            const errorMsg = `Failed to initialize configuration: ${initError.message}`;
            log.error(errorMsg);

            // If this was due to an invalid remote config that was explicitly requested,
            // we should rethrow the error rather than falling back to defaults
            if (this.remoteConfigUrl && initError.message.includes(this.remoteConfigUrl)) {
                throw new Error(errorMsg);
            }

            // Otherwise, fall back to default config
            log.info("Falling back to default configuration");
            this.config = defaultConfig;
        }
    }

    /**
     * Load configuration from a local file
     */
    private async loadLocalConfig(): Promise<void> {
        try {
            if (fs.existsSync(this.configPath)) {
                log.info(`Loading configuration from ${this.configPath}`);
                const fileContent = await fs.promises.readFile(this.configPath, "utf-8");

                try {
                    const localConfig = JSON.parse(fileContent);

                    // Merge with current config
                    this.config = this.mergeConfigs(this.config, localConfig);
                    log.info(`Successfully loaded configuration from ${this.configPath}`);
                } catch (error) {
                    const parseError = error as Error;
                    log.error(`Failed to parse local configuration file: ${parseError.message}`);
                    log.info("Using default configuration");
                    // Don't overwrite the invalid file with defaults yet
                }
            } else {
                log.info(`Local configuration file not found at ${this.configPath}`);
                log.info("Creating default configuration file");
                // Create default config file if it doesn't exist
                await this.saveConfig();
            }
        } catch (error) {
            log.error(`Failed to access local configuration at ${this.configPath}:`, error);
            log.info("Using default configuration");
        }
    }

    /**
     * Load configuration from a remote URL
     * @throws Error if the remote configuration is invalid and was explicitly requested
     */
    private async loadRemoteConfig(url: string): Promise<void> {
        const isExplicitlyRequested = this.remoteConfigUrl === url;

        try {
            log.info(`Fetching configuration from ${url}`);
            const response = await axios.get(url);

            if (response.status === 200 && response.data) {
                try {
                    // Check if the remote config has a schema version
                    const remoteConfig = response.data;
                    const remoteSchemaVersion = remoteConfig.schemaVersion || "0.0.0";
                    const currentSchemaVersion = defaultConfig.schemaVersion || "1.0.0";

                    log.info(`Remote config schema version: ${remoteSchemaVersion}, Current schema version: ${currentSchemaVersion}`);

                    // Validate the remote configuration against our schema
                    // This will succeed even with extra properties due to .passthrough()
                    ConfigSchema.parse(remoteConfig);

                    // Merge with current config
                    this.config = this.mergeConfigs(this.config, remoteConfig);
                    log.info(`Loaded configuration from ${url}`);

                    // Save the updated config locally for future use
                    await this.saveConfig();
                    return;
                } catch (error) {
                    const validationError = error as Error;
                    const errorMsg = `Remote configuration from ${url} is invalid: ${validationError.message}`;
                    log.error(errorMsg);

                    // If this URL was explicitly requested (via command line or env var),
                    // we should fail rather than falling back
                    if (isExplicitlyRequested) {
                        throw new Error(errorMsg);
                    }
                }
            } else {
                const errorMsg = `Failed to load remote configuration from ${url}: Invalid response (status: ${response.status})`;
                log.warn(errorMsg);

                if (isExplicitlyRequested) {
                    throw new Error(errorMsg);
                }
            }
        } catch (error) {
            const fetchError = error as Error;
            const errorMsg = `Failed to load remote configuration from ${url}: ${fetchError.message}`;
            log.error(errorMsg);

            // If this URL was explicitly requested, we should fail rather than falling back
            if (isExplicitlyRequested) {
                throw new Error(errorMsg);
            }
        }

        // Only reach here if the remote config failed but wasn't explicitly requested
        log.info("Falling back to local configuration");
        await this.loadLocalConfig();
    }

    /**
     * Compare semantic versions
     * @returns -1 if v1 < v2, 0 if v1 = v2, 1 if v1 > v2
     */
    private compareVersions(v1: string, v2: string): number {
        const v1Parts = v1.split(".").map(Number);
        const v2Parts = v2.split(".").map(Number);

        for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
            const v1Part = v1Parts[i] || 0;
            const v2Part = v2Parts[i] || 0;

            if (v1Part > v2Part) return 1;
            if (v1Part < v2Part) return -1;
        }

        return 0;
    }

    /**
     * Apply command line overrides to the configuration
     */
    private applyCommandLineOverrides(): void {
        // This is a simplified implementation
        // A more robust solution would parse all command line arguments
        // and apply them to the corresponding config properties
        const { values } = parseArgs({
            options: {
                "teiserver-host": { type: "string" },
                "teiserver-port": { type: "string" },
            },
        });

        if (values["teiserver-host"]) {
            this.config.serverConfig.teiserver.host = values["teiserver-host"] as string;
        }

        if (values["teiserver-port"]) {
            this.config.serverConfig.teiserver.port = parseInt(values["teiserver-port"] as string, 10);
        }
    }

    /**
     * Validate the configuration against the schema
     */
    private validateConfig(): void {
        try {
            ConfigSchema.parse(this.config);
            log.info("Configuration validation successful");
        } catch (error) {
            log.error("Configuration validation failed:", error);
            throw error;
        }
    }

    /**
     * Save the current configuration to the local file
     */
    private async saveConfig(): Promise<void> {
        try {
            await fs.promises.mkdir(path.dirname(this.configPath), { recursive: true });
            await fs.promises.writeFile(this.configPath, JSON.stringify(this.config, null, 2), "utf-8");
            log.info(`Saved configuration to ${this.configPath}`);
        } catch (error) {
            log.error(`Failed to save configuration to ${this.configPath}:`, error);
        }
    }

    /**
     * Merge two configuration objects
     */
    private mergeConfigs(baseConfig: Config, overrideConfig: Partial<Config>): Config {
        return {
            ...baseConfig,
            ...overrideConfig,
            contentSources: {
                ...baseConfig.contentSources,
                ...overrideConfig.contentSources,
                rapid: {
                    ...baseConfig.contentSources.rapid,
                    ...overrideConfig.contentSources?.rapid,
                },
                gameGithub: {
                    ...baseConfig.contentSources.gameGithub,
                    ...overrideConfig.contentSources?.gameGithub,
                },
                api: {
                    ...baseConfig.contentSources.api,
                    ...overrideConfig.contentSources?.api,
                },
            },
            versionDefaults: {
                ...baseConfig.versionDefaults,
                ...overrideConfig.versionDefaults,
            },
            serverConfig: {
                ...baseConfig.serverConfig,
                ...overrideConfig.serverConfig,
                teiserver: {
                    ...baseConfig.serverConfig.teiserver,
                    ...overrideConfig.serverConfig?.teiserver,
                },
                masterServer: {
                    ...baseConfig.serverConfig.masterServer,
                    ...overrideConfig.serverConfig?.masterServer,
                },
            },
        };
    }

    /**
     * Get the entire configuration
     */
    public getConfig(): Config {
        return this.config;
    }

    /**
     * Get the content sources configuration
     */
    public getContentSources() {
        return this.config.contentSources;
    }

    /**
     * Get the version defaults configuration
     */
    public getVersionDefaults() {
        return this.config.versionDefaults;
    }

    /**
     * Get the server configuration
     */
    public getServerConfig() {
        return this.config.serverConfig;
    }

    /**
     * Export the current configuration to a JSON string
     */
    public exportConfig(): string {
        return JSON.stringify(this.config, null, 2);
    }

    /**
     * Import configuration from a JSON string
     * @param jsonConfig The JSON string to import
     * @returns True if the import was successful, false otherwise
     */
    public importConfig(jsonConfig: string): boolean {
        try {
            const newConfig = JSON.parse(jsonConfig);
            // Validate the new configuration
            ConfigSchema.parse(newConfig);
            // Merge with default config to ensure all fields are present
            this.config = this.mergeConfigs(defaultConfig, newConfig);
            // Save the new configuration
            this.saveConfig().catch((error) => {
                log.error("Failed to save imported configuration:", error);
            });
            return true;
        } catch (error) {
            log.error("Failed to import configuration:", error);
            return false;
        }
    }
}

// Create and export a singleton instance
export const configManager = new ConfigManager();
