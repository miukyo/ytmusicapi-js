import { describe, it, expect } from 'vitest';
import { YTMusic } from '../index';

describe('Streaming Mixin Tests', () => {
    const yt = new YTMusic();

    console.log(yt.auth_type)

    it('test_get_streaming_data', async () => {
        const data = await yt.get_streaming_data("5QMsYmJYUlQ");
        expect(data).toBeTypeOf('object');
        expect(data).toHaveProperty('adaptiveFormats');
    }, 20000);

    it('test_get_stream_url', async () => {
        const url = await yt.get_stream_url("5QMsYmJYUlQ");
        // console.log(url);
        expect(url).toBeTypeOf('string');
        expect(url).toMatch(/^https:\/\//);
    }, 20000);
});
