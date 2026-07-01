import { describe, it, expect } from 'vitest';
import { YTMusic } from '../index';

describe('Streaming Mixin Tests', () => {
    const yt = new YTMusic();

    it('test_get_streaming_data', async () => {
        // Rick Astley - Never Gonna Give You Up videoId
        const data = await yt.get_streaming_data("dQw4w9WgXcQ");
        expect(data).toBeTypeOf('object');
        expect(data).toHaveProperty('adaptiveFormats');
    }, 20000);

    it('test_get_stream_url', async () => {
        const url = await yt.get_stream_url("dQw4w9WgXcQ");
        expect(url).toBeTypeOf('string');
        expect(url).toMatch(/^https:\/\//);
    }, 20000);
});
