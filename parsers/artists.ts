import { nav } from '../helpers';
import { JsonList, JsonDict } from '../helpers'; // Use types from helpers for now

import { NAVIGATION_BROWSE_ID } from '../navigation';

// NAVIGATION_BROWSE_ID is imported from navigation.py in Python.
// I need to port navigation.py variables to somewhere. 
// Maybe src/parsers/navigation.ts or just src/constants.ts?
// navigation.py has MANY constants. I should port them all to `src/navigation.ts`.
// I haven't done that yet. I did helpers.ts which includes `nav` but not the constants.

// STOP! I need to port navigation.py constants strictly or I'll be redefining them everywhere.
// I will create `src/navigation.ts` with all constants from `ytmusicapi/navigation.py`.

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
