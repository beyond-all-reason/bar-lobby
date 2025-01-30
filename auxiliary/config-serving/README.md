# Config serving

Cloudflare Worker service hosting lobby config at https://lobby-config.beyondallreason.dev/config.json

The service returns config when hit with `GET` request.

To update config send `PUT` request with new config in the request body. The
request also needs to be authenticated by a OIDC ID token of GitHub Actions
workflow in this repo, with `aud` set to `https://lobby-config.beyondallreason.dev/config.json`
and passed in as `Bearer` token in `Authorization` header. See GitHub docs
about this topic: https://docs.github.com/en/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-cloud-providers
