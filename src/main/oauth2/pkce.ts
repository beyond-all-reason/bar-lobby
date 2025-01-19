import { createHash, randomInt } from "node:crypto";

export function generatePKCE(): [string, string] {
    /**
     * generates a (crypto strong) random challenge and the associated
     * verifier for pkce. All encoding is already done
     * See: https://datatracker.ietf.org/doc/html/rfc7636
     * and: https://www.oauth.com/playground/authorization-code-with-pkce.html
     */
    const charSpace = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
    const len = 47; // must be between 43 and 128
    const buf = Buffer.alloc(len);
    for (let i = 0; i < buf.length; i++) {
        const idx = randomInt(0, charSpace.length);
        buf.write(charSpace.charAt(idx), i);
    }
    const hash = createHash("sha256");
    hash.update(buf);
    const challenge = hash.digest("base64url");
    return [buf.toString(), challenge];
}
