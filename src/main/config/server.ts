export const TEISERVER_HOSTNAME_PORT = "server5.beyondallreason.info"; //"tachyon.geekingfrog.com:4321";

export const OAUTH_AUTHORIZATION_SERVER_URL = `https://${TEISERVER_HOSTNAME_PORT}`;
export const OAUTH_WELL_KNOWN_URL = `${OAUTH_AUTHORIZATION_SERVER_URL}/.well-known/oauth-authorization-server`;
export const OAUTH_CLIENT_ID = "generic_lobby";
export const OAUTH_SCOPE = "tachyon.lobby";

export const WS_SERVER_URL = `wss://${TEISERVER_HOSTNAME_PORT}/tachyon`;
