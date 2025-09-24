<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="mod-tester">
        <h2>Mod System Tester</h2>

        <div class="test-section">
            <h3>Test Repositories</h3>
            <div class="repo-list">
                <div v-for="repo in testRepositories" :key="repo.name" class="repo-item">
                    <div class="repo-info">
                        <strong>{{ repo.name }}</strong>
                        <span class="repo-url">{{ repo.url }}</span>
                    </div>
                    <div class="repo-actions">
                        <Button @click="checkMod(repo)" :loading="loading[repo.name]"> Check </Button>
                        <Button @click="installMod(repo)" :loading="installing[repo.name]"> Install </Button>
                    </div>
                </div>
            </div>
        </div>

        <div class="test-section">
            <h3>Installed Mods</h3>
            <div class="mod-list">
                <div v-for="mod in installedMods" :key="mod.id" class="mod-item">
                    <div class="mod-info">
                        <strong>{{ mod.name }}</strong>
                        <span class="mod-version">v{{ mod.version }}</span>
                        <p class="mod-description">{{ mod.description }}</p>
                    </div>
                    <div class="mod-actions">
                        <Button @click="uninstallMod(mod)" variant="danger" size="small"> Uninstall </Button>
                    </div>
                </div>
            </div>
        </div>

        <div class="test-section">
            <h3>Test Results</h3>
            <div class="test-results">
                <div v-for="result in testResults" :key="result.id" class="result-item" :class="result.status">
                    <span class="result-time">{{ result.time }}</span>
                    <span class="result-message">{{ result.message }}</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from "vue";
import { modStore, initModStore, installModFromGitHub, uninstallMod } from "@renderer/store/mod.store";
import Button from "@renderer/components/controls/Button.vue";

const testRepositories = [
    { name: "modtest1", url: "tetrisface/modtest1", branch: "main" },
    { name: "modtest2", url: "tetrisface/modtest2", branch: "main" },
    { name: "modtest3", url: "tetrisface/modtest3", branch: "main" },
];

const loading = ref<Record<string, boolean>>({});
const installing = ref<Record<string, boolean>>({});
const testResults = ref<Array<{ id: string; time: string; message: string; status: string }>>([]);

const installedMods = ref(modStore.installedMods);

function addResult(message: string, status: "success" | "error" | "info" = "info") {
    testResults.value.unshift({
        id: Date.now().toString(),
        time: new Date().toLocaleTimeString(),
        message,
        status,
    });
}

async function checkMod(repo: (typeof testRepositories)[0]) {
    loading.value[repo.name] = true;
    addResult(`Checking ${repo.url}...`, "info");

    try {
        const exists = await window.mod.checkModExists(repo.url, repo.branch);
        if (exists) {
            const modInfo = await window.mod.getModInfo(repo.url, repo.branch);
            addResult(`✅ ${repo.url} exists: ${modInfo.name} ${modInfo.version}`, "success");
        } else {
            addResult(`❌ ${repo.url} not found or invalid`, "error");
        }
    } catch (error) {
        addResult(`❌ Error checking ${repo.url}: ${error}`, "error");
    } finally {
        loading.value[repo.name] = false;
    }
}

async function installMod(repo: (typeof testRepositories)[0]) {
    installing.value[repo.name] = true;
    addResult(`Installing ${repo.url}...`, "info");

    try {
        // Get the correct mod paths from the main process
        const modPaths = await window.mod.getModPaths();
        const targetPath = `${modPaths[0]}/${repo.name}-test.sdd`; // Use the first mod path (user data directory)
        
        const mod = await installModFromGitHub({
            repository: repo.url,
            branch: repo.branch,
            targetPath: targetPath,
            overwrite: true,
        });

        addResult(`✅ Successfully installed ${mod.name} ${mod.version}`, "success");
        installedMods.value = modStore.installedMods;
    } catch (error) {
        addResult(`❌ Error installing ${repo.url}: ${error}`, "error");
    } finally {
        installing.value[repo.name] = false;
    }
}

async function uninstallMod(mod: any) {
    try {
        await uninstallMod(mod.id);
        addResult(`✅ Uninstalled ${mod.name}`, "success");
        installedMods.value = modStore.installedMods;
    } catch (error) {
        addResult(`❌ Error uninstalling ${mod.name}: ${error}`, "error");
    }
}

onMounted(async () => {
    await initModStore();
    installedMods.value = modStore.installedMods;
    addResult("Mod tester initialized", "info");
});
</script>

<style lang="scss" scoped>
.mod-tester {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
}

.test-section {
    margin-bottom: 2rem;
    padding: 1rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    background-color: rgba(0, 0, 0, 0.3);

    h3 {
        margin: 0 0 1rem 0;
        color: #ffcc00;
    }
}

.repo-list,
.mod-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.repo-item,
.mod-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    background-color: rgba(255, 255, 255, 0.05);

    .repo-info,
    .mod-info {
        flex: 1;

        strong {
            color: #ffffff;
            display: block;
            margin-bottom: 0.25rem;
        }

        .repo-url,
        .mod-version {
            color: #ffcc00;
            font-size: 0.875rem;
        }

        .mod-description {
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.875rem;
            margin: 0.25rem 0 0 0;
        }
    }

    .repo-actions,
    .mod-actions {
        display: flex;
        gap: 0.5rem;
    }
}

.test-results {
    max-height: 300px;
    overflow-y: auto;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    background-color: rgba(0, 0, 0, 0.5);
}

.result-item {
    display: flex;
    gap: 1rem;
    padding: 0.5rem 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);

    &.success {
        color: #4ade80;
    }

    &.error {
        color: #f87171;
    }

    &.info {
        color: #60a5fa;
    }

    .result-time {
        font-size: 0.75rem;
        opacity: 0.7;
        min-width: 80px;
    }

    .result-message {
        flex: 1;
    }
}
</style>
