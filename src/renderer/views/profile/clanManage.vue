<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->
<route lang="json5">
{ meta: { title: "Manage clan", order: 1, transition: { name: "slide-left" } } }
</route>

<template>
    <div class="view">
        <div class="clan-mng-container">
            <div class="view-title">
                <h1>Manage Clan</h1>
                <p>Create clan, manage clan...</p>
            </div>
            <div class="flex-row flex-grow gap-md">
                <div class="clan-mng-left-section">
                    <Panel>
                        <div class="flex-col fullheight fullwidth gap-md">
                            <div class="flex-row gap-md fullwidth">
                                <div class="flex-grow">A</div>
                            </div>
                        </div>
                    </Panel>
                </div>
                <div class="clan-mng-right-section">
                    <Panel>
                        <div class="flex-col fullheight fullwidth gap-md">
                            <div class="flex-row gap-md fullwidth">
                                <div class="flex-grow">B</div>
                            </div>
                        </div>
                    </Panel>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import Panel from "@renderer/components/common/Panel.vue";
</script>
<style lang="scss" src="./manage.scss" scoped></style>
