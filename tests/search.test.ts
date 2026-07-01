import { describe, it, expect } from 'vitest';
import { YTMusic } from '../index';
import { YTMusicUserError } from '../exceptions';

describe('Search Mixin Tests', () => {
    const yt = new YTMusic();

    it('test_search_exceptions', async () => {
        await expect(yt.search("query", "invalid_filter")).rejects.toThrow();
        await expect(yt.search("query", null, "invalid_scope")).rejects.toThrow();
    });

    it('test_search_queries', async () => {
        const results = await yt.search("Oasis Wonderwall");
        expect(results.length).toBeGreaterThan(0);
        expect(results[0]).toHaveProperty('resultType');
    });

    it('test_search_filters', async () => {
        const query = "hip hop playlist";

        const songs = await yt.search(query, "songs");
        expect(songs.length).toBeGreaterThan(0);
        expect(songs.every(item => item.resultType === 'song')).toBe(true);

        const videos = await yt.search(query, "videos");
        expect(videos.length).toBeGreaterThan(0);
        expect(videos.every(item => item.resultType === 'video')).toBe(true);

        const albums = await yt.search(query, "albums");
        expect(albums.length).toBeGreaterThan(0);
        expect(albums.every(item => item.resultType === 'album')).toBe(true);

        const artists = await yt.search("Armin van Buuren", "artists");
        expect(artists.length).toBeGreaterThan(0);
        expect(artists.every(item => item.resultType === 'artist')).toBe(true);

        const playlists = await yt.search("classical music", "playlists");
        expect(playlists.length).toBeGreaterThan(0);
        expect(playlists.every(item => item.resultType === 'playlist')).toBe(true);
    }, 30000);

    it('test_search_suggestions', async () => {
        const suggestions = await yt.get_search_suggestions("oasis");
        expect(suggestions.length).toBeGreaterThan(0);
    });
});
