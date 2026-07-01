import { describe, it, expect } from 'vitest';
import { YTMusic } from '../index';

describe('Podcasts Mixin Tests', () => {
    const yt = new YTMusic();

    it('test_get_channel', async () => {
        // Stanford GSB channelId
        const channel = await yt.get_channel("UCGwuxdEeCf0TIA2RbPOj-8g");
        expect(channel).toBeTypeOf('object');
        expect(channel.title).toBe("Stanford Graduate School of Business");
        expect(channel.thumbnails.length).toBeGreaterThan(0);
        expect(channel.episodes.results.length).toBe(10);
        expect(channel.podcasts.results.length).toBeGreaterThanOrEqual(1);
    }, 20000);

    it('test_get_channel_episodes', async () => {
        const channelId = "UCGwuxdEeCf0TIA2RbPOj-8g";
        const channel = await yt.get_channel(channelId);
        const params = channel.episodes.params;
        const episodes = await yt.get_channel_episodes(channelId, params);
        expect(Array.isArray(episodes)).toBe(true);
    }, 20000);

    it('test_get_podcast', async () => {
        // Stanford GSB Podcast ID
        const podcast = await yt.get_podcast("PLxq_lXOUlvQDUNyoBYLkN8aVt5yAwEtG9");
        expect(podcast).toBeTypeOf('object');
        expect(podcast.title).toBe("Stanford GSB Podcasts");
        expect(podcast.episodes.length).toBeGreaterThan(0);
    }, 20000);

    it('test_get_episode', async () => {
        // An episode from Stanford GSB
        const episode = await yt.get_episode("xAEGaW2my7E");
        expect(episode).toBeTypeOf('object');
        expect(episode.title).toBeDefined();
        expect(episode.description).toBeDefined();
    }, 20000);
});
