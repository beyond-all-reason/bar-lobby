// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { marked, Renderer } from "marked";

const markdownRenderer = new Renderer();

// Prevents marked from parsing #.
marked.use({
    tokenizer: {
        heading() {
            return false;
        },
    },
});

export default markdownRenderer;
