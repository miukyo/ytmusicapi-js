import { describe, it, expect } from 'vitest';
import { YTMusic } from '../index';

describe('Explore & Charts Mixin Tests', () => {
    const yt = new YTMusic();

    it('test_get_mood_playlists', async () => {
        const categories = await yt.get_mood_categories();
        expect(Object.keys(categories).length).toBeGreaterThan(0);
        
        const firstCategoryKey = Object.keys(categories)[0];
        expect(categories[firstCategoryKey].length).toBeGreaterThan(0);
        
        const playlists = await yt.get_mood_playlists(categories[firstCategoryKey][0].params);
        expect(playlists.length).toBeGreaterThan(0);
    }, 20000);

    it('test_get_explore', async () => {
        const explore = await yt.get_explore();
        expect(Object.keys(explore).length).toBeGreaterThanOrEqual(2);
    }, 20000);

    it('test_get_charts', async () => {
        const charts = await yt.get_charts("US");
        expect(charts).toBeTypeOf('object');
        expect(charts.countries.selected).toBeDefined();
        expect(charts.countries.options.length).toBeGreaterThan(0);
    }, 20000);
});
