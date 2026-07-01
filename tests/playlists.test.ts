import { describe, it, expect, vi } from 'vitest';
import { YTMusic } from '../index';
import { read_json_fixture } from './helpers';

describe('Playlists Mixin Tests', () => {
    const yt = new YTMusic();

    it('test_get_playlist (mock public playlist)', async () => {
        const mockResponse = read_json_fixture('data/2024_03_get_playlist_public.json');
        
        const spy = vi.spyOn(yt as any, '_send_request').mockResolvedValue(mockResponse);
        const playlist = await yt.get_playlist("RDCLAK5uy_lWy02cQBnTVTlwuRauaGKeUDH3L6PXNxI");
        
        expect(playlist).toBeTypeOf('object');
        expect(playlist.title).toBeTypeOf('string');
        expect(playlist.tracks.length).toBeGreaterThan(0);
        expect(playlist.tracks[0]).toHaveProperty('title');
        expect(playlist.tracks[0]).toHaveProperty('artists');
        
        spy.mockRestore();
    });
});
