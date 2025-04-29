// TODO: this should reference a real server like server5.beyondallreason.info
// there is an issue with port handling right now, so we can't use the real server
// see https://github.com/beyond-all-reason/teiserver/pull/555
// UPDATE: above issue has been resolved. Leaving note for posterity at the moment.

// export const TEISERVER_HOSTNAME_PORT = "lobby-server-dev.beyondallreason.dev";
import { settingsService } from "@main/services/settings.service"

const TEISERVER_HOSTNAME_PORT = "server4.beyondallreason.info"

export const OAUTH_AUTHORIZATION_SERVER_URL = `https://${TEISERVER_HOSTNAME_PORT}`;
export const OAUTH_WELL_KNOWN_URL = `${OAUTH_AUTHORIZATION_SERVER_URL}/.well-known/oauth-authorization-server`;
export const OAUTH_CLIENT_ID = "generic_lobby";
export const OAUTH_SCOPE = "tachyon.lobby";

export const WS_SERVER_URL = `wss://${TEISERVER_HOSTNAME_PORT}/tachyon`;

function getLobbyServer() {
	return settingsService.getSettings().lobbyServer;
}

function getOAuthAuthorizationServerURL() {
	const url = (`https://${getLobbyServer()}`);
	return url
}

function getOAuthWellKnownURL() {
	const url = (`${getOAuthAuthorizationServerURL()}/.well-known/oauth-authorization-server`);
	return url;
}

export { getOAuthAuthorizationServerURL, getOAuthWellKnownURL }