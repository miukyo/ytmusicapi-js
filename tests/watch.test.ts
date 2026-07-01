import { describe, it, expect } from 'vitest';
import { YTMusic } from '../index';

describe('Watch Mixin Tests', () => {
    const yt = new YTMusic();

    it('test_get_watch_playlist (unauthenticated error check)', async () => {
        // Unauthenticated next/watch playlist requests are restricted by YouTube Music
        await expect(yt.get_watch_playlist("9mWr4c_ig54", null, 25)).rejects.toThrow();
    }, 20000);

    it('test_get_watch_playlist_radio (unauthenticated error check)', async () => {
        await expect(yt.get_watch_playlist("9mWr4c_ig54", null, 25, true)).rejects.toThrow();
    }, 20000);
});
