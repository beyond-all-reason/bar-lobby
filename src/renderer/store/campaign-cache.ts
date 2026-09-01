// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ref } from "vue";
import type { CampaignModel } from "@main/content/game/campaign-model";

/** Populated by campaign.vue so child route views don't need their own IPC call. */
export const campaignCache = ref<CampaignModel[]>([]);
