# Dynamic Configuration System

This directory contains the dynamic configuration system for the BAR Lobby application. The system allows for configuration to be loaded from multiple sources and overridden at runtime.

## Features

- **JSON Schema Validation**: Using Zod to define and validate the configuration schema.
- **Dynamic Configuration**: Loading configuration from local files and remote URLs.
- **Command Line Overrides**: Allowing configuration to be overridden via command line arguments.
- **Fallback Mechanism**: Using default values when configuration is missing or invalid.
- **Documentation**: Generating JSON schema for documentation.
- **Schema Versioning**: Support for evolving the configuration schema over time.

## Configuration Sources (in order of precedence)

1. **Command Line Arguments**: Highest priority, overrides all other sources.
2. **Remote Configuration**: Loaded from a URL specified via command line or environment variable.
3. **Local Configuration**: Loaded from a file on disk.
4. **Default Configuration**: Hardcoded defaults used as a fallback.

## Schema Versioning and Compatibility

The configuration system supports schema evolution through versioning:

- **Schema Version**: Each configuration includes a `schemaVersion` field (e.g., "1.0.0").
- **Forward Compatibility**: The schema uses `.passthrough()` to allow unknown properties, so newer configs with additional fields won't fail validation in older app versions.
- **Backward Compatibility**: Required fields are always validated, ensuring that older configs provide the minimum required data for newer app versions.
- **Explicit URL Failures**: If a remote URL is explicitly specified but contains invalid configuration, the application will fail rather than silently falling back to local configuration.

### Guidelines for Schema Evolution

When evolving the configuration schema:

1. **Add, Don't Remove**: Add new fields rather than removing existing ones.
2. **Default Values**: Provide sensible defaults for new fields.
3. **Version Increment**: Increment the schema version when making changes:
    - Patch (1.0.x): Non-breaking additions
    - Minor (1.x.0): Significant additions, but backward compatible
    - Major (x.0.0): Breaking changes

## Usage

### In Code

```typescript
import { configManager } from "./config-manager";

// Get the entire configuration
const config = configManager.getConfig();

// Get specific sections
const contentSources = configManager.getContentSources();
const versionDefaults = configManager.getVersionDefaults();
const serverConfig = configManager.getServerConfig();

// Export/Import configuration
const configJson = configManager.exportConfig();
configManager.importConfig(configJson);
```

### Command Line Arguments

```bash
# Specify a custom configuration file
electron . --config-path=/path/to/config.json

# Specify a remote configuration URL
electron . --config-url=https://example.com/config.json

# Override specific configuration values
electron . --teiserver-host=example.com --teiserver-port=8200
```

## Configuration Schema

The configuration schema is defined in `schema.ts` using Zod. This provides runtime validation and TypeScript type safety.

To generate a JSON schema for documentation:

```bash
npm run generate-schema
```

This will create a `config.schema.json` file in the `schema` directory.

## Adding New Configuration Options

1. Update the schema in `schema.ts`
2. Update the default configuration in `schema.ts`
3. Add getters to `config-manager.ts` if needed
4. Update the command line argument parsing in `config-manager.ts` if needed
5. Increment the schema version appropriately

## Example Configuration

```json
{
    "schemaVersion": "1.0.0",
    "contentSources": {
        "rapid": {
            "host": "repos-cdn.beyondallreason.dev",
            "game": "byar"
        },
        "gameGithub": {
            "owner": "beyond-all-reason",
            "repo": "Beyond-All-Reason"
        },
        "api": {
            "baseUrl": "https://files-cdn.beyondallreason.dev",
            "findEndpoint": "/find"
        }
    },
    "versionDefaults": {
        "latestEngineVersion": "2025.01.3",
        "latestGameVersion": "byar:test"
    },
    "serverConfig": {
        "teiserver": {
            "host": "server.beyondallreason.dev",
            "port": 8200
        },
        "masterServer": {
            "url": "https://config.beyondallreason.dev",
            "configEndpoint": "/config.json"
        }
    }
}
```
