import { nav } from '../helpers';
import { JsonList, JsonDict } from '../helpers'; // Use types from helpers for now

import { NAVIGATION_BROWSE_ID } from '../navigation';

export function parse_artists_runs(runs: JsonList): JsonList {
    const artists = [];
    for (let j = 0; j < Math.floor(runs.length / 2) + 1; j++) {
        artists.push({
            "name": runs[j * 2]["text"],
            "id": nav(runs[j * 2], NAVIGATION_BROWSE_ID, true)
        });
    }
    return artists;
}
