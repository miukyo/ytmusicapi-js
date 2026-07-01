import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { setup_browser } from '../auth/browser';
import { get_resource } from './helpers';

function validate_headers(headers_json_as_str: string) {
    let headers_json: any;
    try {
        headers_json = JSON.parse(headers_json_as_str);
    } catch (e) {
        throw new Error("Headers are not a valid JSON string");
    }
    expect(headers_json).toBeTypeOf('object');
    expect(Object.keys(headers_json).length).toBeGreaterThan(0);
}

describe('Browser Authentication Setup', () => {
    it.each([
        'raw_chrome_headers.txt',
        'raw_firefox_headers.txt'
    ])('should parse headers successfully from %s', async (fileName) => {
        const rawHeadersPath = get_resource(`data/${fileName}`);
        const rawHeaders = fs.readFileSync(rawHeadersPath, 'utf8');

        // Verify setup_browser directly
        const headersJsonStr = await setup_browser(null, rawHeaders);
        validate_headers(headersJsonStr);
    });
});
