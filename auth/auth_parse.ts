import fs from 'fs';
import { AuthType } from './types';
import { YTMusicUserError } from '../exceptions';
import { JsonDict } from '../helpers';

// Stub for OAuthToken.is_oauth check
// Token members: scope, token_type, access_token, refresh_token, expires_at
const TOKEN_MEMBERS = ["scope", "token_type", "access_token", "refresh_token", "expires_at", "expires_in"];

function is_oauth(headers: Record<string, any>): boolean {
    // Basic check if all required keys are present
    // expires_at OR expires_in might be present. Python logic checks for keys in Token.members().
    // Token dataclass has fields.
    // Let's assume strict check for now.
    return ["scope", "token_type", "access_token", "refresh_token"].every(k => k in headers);
}

function encodeUnicode(str: string): string {
    const printable = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~ \t\n\r\v\f";
    return Array.from(str).map(char => {
        const isPrintable = printable.includes(char);
        return isPrintable ? char : encodeURIComponent(char);
    }).join('');
}

export function parse_auth_str(auth: string | JsonDict): [Record<string, string>, string | null] {
    let auth_path: string | null = null;
    let input_json: JsonDict;

    if (typeof auth === 'string') {
        const auth_str = auth;
        try {
            if (auth_str.trim().startsWith("{")) {
                input_json = JSON.parse(auth_str);
            } else if (fs.existsSync(auth_str)) {
                auth_path = auth_str;
                const file_content = fs.readFileSync(auth_path, 'utf8');
                input_json = JSON.parse(file_content);
            } else {
                throw new Error("Invalid auth JSON string or file path provided.");
            }
        } catch (e) {
            throw new YTMusicUserError(`Invalid auth JSON string or file path provided. Error: ${e}`);
        }

    } else {
        input_json = auth;
    }

    const encoded_headers: Record<string, string> = {};
    for (const [key, val] of Object.entries(input_json)) {
        if (typeof val === 'string') {
            encoded_headers[key] = encodeUnicode(val);
        } else {
            encoded_headers[key] = String(val);
        }
    }

    return [encoded_headers, auth_path];
}

export function determine_auth_type(auth_headers: Record<string, any>): AuthType {
    let auth_type = AuthType.OAUTH_CUSTOM_CLIENT;

    if (is_oauth(auth_headers)) {
        auth_type = AuthType.OAUTH_CUSTOM_CLIENT;
    }

    const authorization = auth_headers["authorization"] || auth_headers["Authorization"];
    if (authorization) {
        if (authorization.includes("SAPISIDHASH")) {
            auth_type = AuthType.BROWSER;
        } else if (authorization.startsWith("Bearer")) {
            auth_type = AuthType.OAUTH_CUSTOM_FULL;
        }
    }

    return auth_type;
}
