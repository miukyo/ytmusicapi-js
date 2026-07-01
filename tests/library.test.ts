import { describe, it, expect } from 'vitest';
import { YTMusic } from '../index';

describe('Library & Uploads Authentication Checks', () => {
    const yt = new YTMusic();

    it('should throw auth error for unauthenticated library requests', async () => {
        await expect(yt.get_library_playlists()).rejects.toThrow(/provide authentication/);
        await expect(yt.get_library_songs()).rejects.toThrow(/provide authentication/);
        await expect(yt.get_library_albums()).rejects.toThrow(/provide authentication/);
        await expect(yt.get_library_artists()).rejects.toThrow(/provide authentication/);
        await expect(yt.get_library_subscriptions()).rejects.toThrow(/provide authentication/);
        await expect(yt.get_library_podcasts()).rejects.toThrow(/provide authentication/);
        await expect(yt.get_library_channels()).rejects.toThrow(/provide authentication/);
        await expect(yt.get_history()).rejects.toThrow(/provide authentication/);
    });

    it('should throw auth error for unauthenticated upload requests', async () => {
        await expect(yt.get_library_upload_songs()).rejects.toThrow(/provide authentication/);
        await expect(yt.get_library_upload_albums()).rejects.toThrow(/provide authentication/);
        await expect(yt.get_library_upload_artists()).rejects.toThrow(/provide authentication/);
        await expect(yt.upload_song("dummy.mp3")).rejects.toThrow(/provide authentication/);
    });
});
