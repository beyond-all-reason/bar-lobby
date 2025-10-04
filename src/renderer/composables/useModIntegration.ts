// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { computed, type Ref } from "vue";
import { ModMetadata } from "@main/content/mods/mod-types";

export interface ModIntegrationOptions {
    selectedMods: Ref<ModMetadata[]>;
}

export interface ModIntegrationReturn {
    modScriptContent: Ref<string>;
    hasMods: Ref<boolean>;
    generateModScriptContent: () => string;
    injectModsIntoScript: (script: string) => string;
}

/**
 * Composable for integrating mod selection with scenario launches.
 * Handles the conversion of selected mods into Spring engine compatible formats.
 */
export function useModIntegration(options: ModIntegrationOptions): ModIntegrationReturn {
    const { selectedMods } = options;

    // Computed properties
    const hasMods = computed(() => {
        return selectedMods.value.length > 0;
    });

    const modScriptContent = computed(() => {
        return generateModScriptContent();
    });

    /**
     * Generates Spring engine compatible mod script content.
     * This includes MUTATOR sections and mod-specific configuration.
     */
    function generateModScriptContent(): string {
        if (!hasMods.value) {
            return "";
        }

        let scriptContent = "";

        // Add MUTATOR entries for each mod
        // Based on RecoilEngine source: GAME\MUTATOR{0..9} should be values inside the [Game] section
        selectedMods.value.forEach((mod, index) => {
            // Extract the .sdd archive name from the install path
            const pathParts = mod.installPath.split(/[/\\]/);
            const archiveName = pathParts[pathParts.length - 1];

            // The correct syntax is MUTATOR0=archiveName; inside the [Game] section
            scriptContent += `    MUTATOR${index}=${archiveName};\n`;
        });

        return scriptContent;
    }

    /**
     * Injects mod content into a Spring script at the appropriate location.
     * This method finds the right place to insert mod sections in the script.
     */
    function injectModsIntoScript(script: string): string {
        if (!hasMods.value) {
            return script;
        }

        const modContent = generateModScriptContent();

        // Find the end of the main [Game] section
        // The script structure is: [Game] { ... content ... }
        // We want to inject mods before the final closing brace of the [Game] section

        // Look for the last closing brace that's not part of a nested section
        // We'll find the last '}' that's at the root level
        let braceCount = 0;
        let lastRootBrace = -1;

        for (let i = 0; i < script.length; i++) {
            if (script[i] === "{") {
                braceCount++;
            } else if (script[i] === "}") {
                braceCount--;
                if (braceCount === 0) {
                    lastRootBrace = i;
                }
            }
        }

        if (lastRootBrace === -1) {
            // If no proper structure found, append at the end
            return script + "\n" + modContent;
        }

        // Insert mod content before the final closing brace
        const beforeClosing = script.substring(0, lastRootBrace);
        const afterClosing = script.substring(lastRootBrace);

        return beforeClosing + "\n" + modContent + "\n" + afterClosing;
    }

    return {
        modScriptContent,
        hasMods,
        generateModScriptContent,
        injectModsIntoScript,
    };
}
