<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->
<route lang="json5">
{ meta: { title: "Create clan", order: 2, transition: { name: "slide-left" } } }
</route>
<template>
    <div class="view">
        <div class="clan-create-container">
            <div class="view-title">
                <h1>Create Clan</h1>
                <p>Create your own clan</p>
            </div>
            <div class="flex-row flex-grow gap-md">
                <Panel style="min-width: 100%">
                    <div class="flex-col fullheight fullwidth gap-md" style="min-width: 100%">
                        <div class="flex-row gap-md fullwidth" style="min-width: 100%">
                            <div class="flex-grow" style="min-width: 100%">
                                <div style="width: 50%">
                                    <div>
                                        <div>Name:</div>
                                        <Textbox v-model="newClanData.name" maxlength="30" style="width: 100%" />
                                        <div style="font-size: 0.9em; color: #999; margin-top: 4px">
                                            {{ (newClanData.name ?? "").length }}/{{ maxClanName }}
                                        </div>
                                    </div>
                                    <div>
                                        <div>Tag:</div>
                                        <Textbox v-model="newClanData.tag" maxlength="10" style="width: 100%" />
                                        <div style="font-size: 0.9em; color: #999; margin-top: 4px">
                                            {{ (newClanData.tag ?? "").length }}/{{ maxClanTag }}
                                        </div>
                                    </div>
                                    <div>
                                        <div>Language:</div>
                                        <Textbox v-model="newClanData.language" maxlength="10" style="width: 100%" />
                                    </div>
                                    <div style="margin-bottom: 10px">
                                        <div>Descrition:</div>
                                        <Textarea
                                            v-model="newClanData.description"
                                            maxlength="500"
                                            style="width: 100%; min-height: 100%; height: 250px"
                                        />
                                        <div style="font-size: 0.9em; color: #999; margin-top: 4px">
                                            {{ (newClanData.description ?? "").length }}/{{ maxClanDescription }}
                                        </div>
                                    </div>
                                    <Button class="clan-create-button" v-on:click="clickCreate">Create</Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </Panel>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import Panel from "@renderer/components/common/Panel.vue";
import Textbox from "@renderer/components/controls/Textbox.vue";
import Textarea from "@renderer/components/controls/Textarea.vue";
import Button from "@renderer/components/controls/Button.vue";
import { clanfuncs } from "@renderer/store/clans.store";
import { ClanCreateRequestData } from "tachyon-protocol/types";

const newClanData = ref<ClanCreateRequestData>({
    name: "",
    tag: "",
    language: "",
    description: "",
});

const maxClanName = 30;
const maxClanTag = 10;
const maxClanDescription = 500;

async function clickCreate() {
    const success = await clanfuncs.createClan(newClanData.value);
    if (success) {
        newClanData.value = { name: "", tag: "", language: "", description: "" };
    }
}
</script>

<style lang="scss" scoped>
.clan-create-container {
    display: flex;
    flex-direction: column;
    width: 80%;
    height: 100%;
    align-self: center;
}
.clan-create-button {
    align-self: center;
    font-family: Rajdhani;
    font-weight: bold;
    font-size: 1.4rem;
    padding: 10px 40px;
    border: none;
    border-radius: 2px;
    text-align: center;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition:
        transform 0.3s ease,
        box-shadow 0.3s ease;
}
.clan-create-button {
    color: #fff;
    background: linear-gradient(90deg, #22c55e, #16a34a);
    box-shadow: 0 0 15px rgba(34, 197, 94, 0.4);
}
.clan-create-button:hover {
    box-shadow: 0 0 25px rgba(34, 197, 94, 0.6);
}
</style>
