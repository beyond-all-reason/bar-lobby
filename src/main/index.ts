import { configManager } from "./config/config-manager";

// Initialize the app
async function init() {
    // Initialize configuration before anything else
    await configManager.initialize();

    // ... existing initialization code ...
}
