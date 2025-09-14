<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<route lang="json5">
{ props: true, meta: { title: "Lobby", hide: true, transition: { name: "slide-left" } } }
</route>

<template>
    <Panel>
		<div class="flex flex-row">
			<Button @click="router.push('/play/customLobbies/customLobbies');" class="flex-left">Back</Button>
			<Button @click="tachyon.leaveLobby()" class="flex-right">Leave Lobby</Button>
		</div>
        <div v-if="tachyonStore.activeLobby">
			<div>
				<div v-for="(item, name, index) in tachyonStore.activeLobby" :key="index" :class="getStripeResult(index)">
					<div class="margin-left-sm padding-top-sm padding-bottom-sm">
						<p class="txt-md">
							<b>{{ name }}</b>
						</p>
					</div>
					<div class="margin-right-sm padding-top-sm padding-bottom-sm txt-right">
						<div v-if="(name == 'allyTeams' || name == 'members' || name == 'currentBattle')">
							<ul>
								<div v-for="(i, n, x) in item" :key="x">
									<li>{{ n }} - {{ i }}</li>
								</div>
							</ul>
						</div>
						<div v-else><p  class="txt-md">{{ item }}</p></div>
					</div>
				</div>
			</div>
		</div>
    </Panel>
</template>

<script lang="ts" setup>
import Panel from "@renderer/components/common/Panel.vue";
import Button from "@renderer/components/controls/Button.vue";
import { tachyonStore, tachyon } from "@renderer/store/tachyon.store";
import { router } from "@renderer/router";

function getStripeResult(index: number) {
    return index & 1 ? "datagrid" : "datagrid datagridstripe";
}
</script>

<style>
.datagrid {
    display: grid;
    grid-template-columns: 15% 1fr;
    height: auto;
}
.datagridstripe {
    background-color: #00000033;
}
</style>