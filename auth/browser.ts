import fs from 'fs';
import readline from 'readline';
import { initialize_headers } from '../helpers';
import { YTMusicError, YTMusicUserError } from '../exceptions';

// Placeholder for exceptions if not yet defined
class YTMusicErrorStub extends Error { constructor(message: string) { super(message); this.name = "YTMusicError"; } }
class YTMusicUserErrorStub extends Error { constructor(message: string) { super(message); this.name = "YTMusicUserError"; } }

// We will use the proper exceptions once we define them in src/index.ts or src/exceptions.ts
// For now, let's assume we create valid exception classes. 

export function is_browser(headers: Record<string, string>): boolean {
    const browser_structure = ["authorization", "cookie"];
    return browser_structure.every(key => key in headers);
}

export async function setup_browser(filepath: string | null = null, headers_raw: string | null = null): Promise<string> {
    let contents: string[] = [];

    if (!headers_raw) {
        console.log("Please paste the request headers from Firefox or Chrome/Edge and press Ctrl-D (Unix) or Ctrl-Z (Windows) then Enter to continue:");

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: false
        });

        for await (const line of rl) {
            contents.push(line);
        }
    } else {
        contents = headers_raw.split("\n");
    }

    let user_headers: Record<string, string> = {};
    let chrome_remembered_key = "";

    try {
        for (const content of contents) {
            const header = content.trim().split(": ");
            if (header[0].startsWith(":")) continue; // chromium headers
            if (header[0].endsWith(":")) {
                chrome_remembered_key = header[0].slice(0, -1);
            }
            if (header.length === 1) {
                if (chrome_remembered_key) {
                    user_headers[chrome_remembered_key.toLowerCase()] = header[0];
                    if (!header[0].endsWith(":") && (chrome_remembered_key !== "Decoded" || header[0] === "}")) {
                        chrome_remembered_key = "";
                    }
                } else {
                    chrome_remembered_key = header[0];
                }
                continue;
            }

            user_headers[header[0].toLowerCase()] = header.slice(1).join(": ");
        }
    } catch (e) {
        throw new Error(`Error parsing your input, please try again. Full error: ${e}`);
    }

    const missing_headers = ["cookie", "x-goog-authuser"].filter(k => !Object.keys(user_headers).includes(k.toLowerCase()));

    if (missing_headers.length > 0) {
        throw new Error(
            "The following entries are missing in your headers: "
            + missing_headers.join(", ")
            + ". Please try a different request (such as /browse) and make sure you are logged in."
        );
    }

    const ignore_headers = new Set(["host", "content-length", "accept-encoding"]);
    for (const key of Object.keys(user_headers)) {
        if (key.startsWith("sec") || ignore_headers.has(key)) {
            delete user_headers[key];
        }
    }

    const init_headers = initialize_headers();
    Object.assign(user_headers, init_headers);

    if (filepath) {
        fs.writeFileSync(filepath, JSON.stringify(user_headers, null, 4));
    }

    return JSON.stringify(user_headers);
}
