// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

const PAGE = `<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Beyond All Reason Lobby Redirector</title>
    </head>
    <body>
        <h1>Beyond All Reason Lobby Redirector</h1>
    </body>
</html>
`;

export default {
    fetch() {
        return new Response(PAGE, { headers: { "content-type": "text/html; charset=utf-8" } });
    },
} satisfies ExportedHandler<Env>;
