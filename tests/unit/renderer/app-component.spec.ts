// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { describe, it, expect, vi } from "vitest";
import { shallowMount } from "@vue/test-utils";
import App from "@renderer/App.vue";

Object.defineProperty(window, "barNavigation", {
    value: {
        onNavigateTo: vi.fn(),
    },
    writable: true,
});

vi.mock("@renderer/store/settings.store", () => ({
    settingsStore: {
        isInitialized: true,
        skipIntro: true,
        devMode: false,
    },
}));

vi.mock("@renderer/store/infos.store", () => ({
    infosStore: {
        lobby: { version: "1.2.3" },
    },
}));

vi.mock("@renderer/store/battle.store", () => ({
    battleStore: {
        isLobbyOpened: false,
        isSelectingGameMode: false,
    },
}));

vi.mock("@renderer/store/me.store", () => ({
    me: { isAuthenticated: true },
    auth: { playOffline: vi.fn() },
}));

vi.mock("@renderer/store/tachyon.store", () => ({
    tachyonStore: { isConnected: true },
}));

vi.mock("@renderer/utils/play-random-music", () => ({
    playRandomMusic: vi.fn(),
}));

vi.mock("@renderer/composables/useGlobalKeybindings", () => ({
    useGlobalKeybindings: vi.fn(),
}));

// Mock child components
vi.mock("@/renderer/components/battle/StickyBattle.vue", () => ({ default: { name: "StickyBattle", template: "<div />" } }));
vi.mock("@/renderer/components/misc/Background.vue", () => ({ default: { name: "Background", template: "<div />" } }));
vi.mock("@/renderer/components/misc/DebugSidebar.vue", () => ({ default: { name: "DebugSidebar", template: "<div />" } }));
vi.mock("@/renderer/components/misc/Error.vue", () => ({ default: { name: "Error", template: "<div />" } }));
vi.mock("@/renderer/components/misc/InitialSetup.vue", () => ({ default: { name: "InitialSetup", template: "<div />" } }));
vi.mock("@/renderer/components/misc/IntroVideo.vue", () => ({ default: { name: "IntroVideo", template: "<div />" } }));
vi.mock("@/renderer/components/misc/Preloader.vue", () => ({ default: { name: "Preloader", template: "<div />" } }));
vi.mock("@/renderer/components/navbar/NavBar.vue", () => ({ default: { name: "NavBar", template: "<div />" } }));
vi.mock("@/renderer/components/navbar/Settings.vue", () => ({ default: { name: "Settings", template: "<div />" } }));
vi.mock("@/renderer/components/navbar/ServerSettings.vue", () => ({ default: { name: "ServerSettings", template: "<div />" } }));
vi.mock("@/renderer/components/notifications/Notifications.vue", () => ({ default: { name: "Notifications", template: "<div />" } }));
vi.mock("@/renderer/components/prompts/PromptContainer.vue", () => ({ default: { name: "PromptContainer", template: "<div />" } }));
vi.mock("@/renderer/components/common/Loader.vue", () => ({ default: { name: "Loader", template: "<div />" } }));
vi.mock("@/renderer/components/social/ChatComponent.vue", () => ({ default: { name: "ChatComponent", template: "<div />" } }));
vi.mock("@/renderer/components/battle/FullscreenGameModeSelector.vue", () => ({ default: { name: "FullscreenGameModeSelector", template: "<div />" } }));

// Router mock
vi.mock("vue-router", () => ({
    useRouter: () => ({
        currentRoute: { value: { meta: {} } },
        push: vi.fn(),
        beforeEach: vi.fn(),
        afterEach: vi.fn(),
    }),
}));

describe("App.vue", () => {
    it("renders the App root and lobby version", () => {
        const wrapper = shallowMount(App, {
            global: {
                stubs: ["RouterView", "Transition", "Suspense", "KeepAlive"],
            },
        });
        expect(wrapper.find("#wrapper").exists()).toBe(true);
        expect(wrapper.text()).toContain("1.2.3");
        expect(wrapper.findComponent({ name: "Error" }).exists()).toBe(true);
    });
});
