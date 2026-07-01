import { describe, it, expect, vi } from 'vitest';
import { YTMusic } from '../index';
import { read_json_fixture } from './helpers';

describe('Browsing Mixin Tests', () => {
    const yt = new YTMusic();

    it('test_get_artist', async () => {
        // Oasis artist channel ID
        const results = await yt.get_artist("MPLAUCmMUZbaYdNH0bEd1PAlAqsA");
        expect(results).toBeTypeOf('object');
        expect(results.name).toBe("Oasis");
        expect(results.shuffleId).not.toBeNull();
        expect(results.radioId).not.toBeNull();
    });

    it('test_get_artist_description (mock 1)', async () => {
        const mockResponse = read_json_fixture('data/2026_05_get_artist1.json');
        const expectedOutput = read_json_fixture('data/expected_output/2026_05_get_artist1.json');

        const spy = vi.spyOn(yt as any, '_send_request').mockResolvedValue(mockResponse);
        const result = await yt.get_artist("UCJwGWV914kBlV4dKRn7AEFA");

        expect(result.description).toBe(expectedOutput.description);
        expect(result.descriptionRuns).toEqual(expectedOutput.descriptionRuns);
        spy.mockRestore();
    });

    it('test_get_artist_description (mock 2)', async () => {
        const mockResponse = read_json_fixture('data/2026_05_get_artist2.json');
        const expectedOutput = read_json_fixture('data/expected_output/2026_05_get_artist2.json');

        const spy = vi.spyOn(yt as any, '_send_request').mockResolvedValue(mockResponse);
        const result = await yt.get_artist("UC5CwaMl1eIgY8h02uZw7u8A");

        expect(result.description).toBe(expectedOutput.description);
        expect(result.descriptionRuns).toEqual(expectedOutput.descriptionRuns);
        spy.mockRestore();
    });

    it('test_get_album', async () => {
        // Eminem - Revival album ID
        const album = await yt.get_album("MPREb_4pL8gzRtw1p");
        expect(album).toBeTypeOf('object');
        expect(album.title).toBe("Revival");
        expect(album.tracks.length).toBeGreaterThan(0);
        expect(album.duration_seconds).toBeGreaterThan(0);
    });

    it('test_get_song_credits', async () => {
        // KANGTA - The Cure credits ID
        const credits = await yt.get_song_credits("MPTCJpKLGcWBJ5Y");
        expect(credits).toBeTypeOf('object');
        expect(credits.other_sections).toBeTypeOf('object');
    });

    it('test_get_home', async () => {
        const home = await yt.get_home(3);
        expect(home.length).toBeGreaterThan(0);
        expect(home[0]).toHaveProperty('title');
        expect(home[0]).toHaveProperty('contents');
    }, 20000);
});
