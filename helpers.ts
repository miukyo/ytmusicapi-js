import axios, { AxiosResponse } from 'axios';
import crypto from 'crypto';
import { YTM_DOMAIN, USER_AGENT } from './constants';

export type JsonDict = Record<string, any>;
export type JsonList = any[];

export function initialize_headers(): Record<string, string> {
    return {
        "user-agent": USER_AGENT,
        "accept": "*/*",
        "accept-encoding": "gzip, deflate",
        "content-type": "application/json",
        "content-encoding": "gzip",
        "origin": YTM_DOMAIN,
    };
}

export function initialize_context(): JsonDict {
    const date = new Date();
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');

    return {
        "context": {
            "client": {
                "clientName": "WEB_REMIX",
                "clientVersion": `1.${year}${month}${day}.01.00`,
            },
            "user": {},
        }
    };
}

export async function get_visitor_id(): Promise<string> {
    const response = await axios.get(YTM_DOMAIN);
    const matches = /ytcfg\.set\s*\(\s*({.+?})\s*\)\s*;/.exec(response.data);
    let visitor_id = "";
    if (matches && matches.length > 0) {
        try {
            const ytcfg = JSON.parse(matches[1]);
            visitor_id = ytcfg?.VISITOR_DATA || "";
        } catch (e) {
            console.error("Error parsing visitor data", e);
        }
    }
    return visitor_id;
}

export function sapisid_from_cookie(raw_cookie: string): string {
    const cookies = raw_cookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.split('=').map(c => c.trim());
        if (key && value) acc[key] = value;
        return acc;
    }, {} as Record<string, string>);

    return cookies["__Secure-3PAPISID"] || "";
}

export function get_authorization(auth: string): string {
    const sha1 = crypto.createHash('sha1');
    const unix_timestamp = Math.floor(Date.now() / 1000).toString();
    sha1.update(unix_timestamp + " " + auth, 'utf8');
    return "SAPISIDHASH " + unix_timestamp + "_" + sha1.digest('hex');
}

export function to_int(string: string): number {
    const number_string = string.replace(/\D/g, "");
    try {
        return parseInt(number_string, 10);
    } catch {
        return parseInt(number_string.replace(/,/g, ""), 10);
    }
}

export function sum_total_duration(item: JsonDict): number {
    if (!item.tracks) return 0;
    return item.tracks.reduce((sum: number, track: any) => {
        return sum + (track.duration_seconds && typeof track.duration_seconds === 'number' ? track.duration_seconds : 0);
    }, 0);
}

// Navigation helpers ported from navigation.py

export function nav(root: JsonDict | null, items: any[], none_if_absent: boolean = false): any | null {
    if (root === null) return null;
    let current = root;
    try {
        for (const k of items) {
            current = current[k];
        }
    } catch (e) {
        if (none_if_absent) return null;
        throw new Error(`Unable to find path ${JSON.stringify(items)} on object`);
    }
    // Check if undefined, treat as error if none_if_absent is false? 
    // Typescript access returns undefined, Python raises KeyError/IndexError.
    if (current === undefined) {
        if (none_if_absent) return null;
        throw new Error(`Unable to find path ${JSON.stringify(items)} on object (undefined)`);
    }

    return current;
}

export function find_object_by_key(object_list: JsonList, key: string, nested: string | null = null, is_key: boolean = false): JsonDict | null {
    for (let item of object_list) {
        if (nested) {
            item = item[nested];
        }
        if (item && key in item) {
            return is_key ? item[key] : item;
        }
    }
    return null;
}

export function find_objects_by_key(object_list: JsonList, key: string, nested: string | null = null): JsonList {
    const objects = [];
    for (let item of object_list) {
        if (nested) {
            item = item[nested];
        }
        if (item && key in item) {
            objects.push(item);
        }
    }
    return objects;
}

export interface HyperLink {
    text: string;
    url: string;
}

export interface PlainText {
    text: string;
}

export type TextRun = HyperLink | PlainText;

export function parse_description_runs(descriptionRunsList: any[] | null | undefined): [string, TextRun[]] {
    if (!Array.isArray(descriptionRunsList)) {
        return ["", []];
    }

    const description_runs: TextRun[] = [];
    let description = "";

    for (const run of descriptionRunsList) {
        description += run.text;

        if ("navigationEndpoint" in run) {
            const link = nav(run, ["navigationEndpoint", "urlEndpoint", "url"]);
            const desc = run.text;
            description_runs.push({ text: desc, url: link });
        } else {
            description_runs.push({ text: run.text });
        }
    }

    return [description, description_runs];
}

