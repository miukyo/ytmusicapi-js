import { nav, find_object_by_key, JsonDict, JsonList } from '../helpers';
import * as NAV from '../navigation';
import { parse_song_runs } from './songs';
import { parse_playlist_items } from './playlists';
import { parse_podcast } from './podcasts';
import { parse_content_list } from './browsing';
import { get_item_text, parse_menu_playlists } from './utils';
import { get_continuations } from '../continuations';

export function parse_artists(results: JsonList, uploaded: boolean = false): JsonList {
    const artists: JsonList = [];
    for (const result of results) {
        const data = result[NAV.MRLIR];
        const artist: JsonDict = {};
        artist["browseId"] = nav(data, NAV.NAVIGATION_BROWSE_ID);
        artist["artist"] = get_item_text(data, 0);
        
        const page_type = nav(data, [...NAV.NAVIGATION_BROWSE, ...NAV.PAGE_TYPE], true);
        if (page_type === "MUSIC_PAGE_TYPE_USER_CHANNEL") {
            artist["type"] = "channel";
        } else if (page_type === "MUSIC_PAGE_TYPE_ARTIST") {
            artist["type"] = "artist";
        }
        
        parse_menu_playlists(data, artist);
        if (uploaded) {
            artist["songs"] = (get_item_text(data, 1) || "").split(" ")[0];
        } else {
            const subtitle = get_item_text(data, 1);
            if (subtitle) {
                artist["subscribers"] = subtitle.split(" ")[0];
            }
        }
        artist["thumbnails"] = nav(data, NAV.THUMBNAILS, true);
        artists.push(artist);
    }
    return artists;
}

export async function parse_library_albums(
    response: JsonDict,
    request_func: (params: string) => Promise<JsonDict>,
    limit: number | null
): Promise<JsonList> {
    const results = get_library_contents(response, NAV.GRID);
    if (!results) return [];
    const albums = parse_albums(results["items"]);

    if ("continuations" in results) {
        const parse_func = (contents: JsonList) => parse_albums(contents);
        const remaining_limit = limit === null ? null : (limit - albums.length);
        albums.push(...(await get_continuations(results, "gridContinuation", remaining_limit, request_func, parse_func)));
    }

    return albums;
}

export function parse_albums(results: JsonList): JsonList {
    const albums: JsonList = [];
    for (const result of results) {
        const data = result[NAV.MTRIR];
        const album: JsonDict = {};
        album["browseId"] = nav(data, [...NAV.TITLE, ...NAV.NAVIGATION_BROWSE_ID]);
        album["playlistId"] = nav(data, NAV.MENU_PLAYLIST_ID, true);
        album["title"] = nav(data, NAV.TITLE_TEXT);
        album["thumbnails"] = nav(data, NAV.THUMBNAIL_RENDERER);

        if (data["subtitle"] && "runs" in data["subtitle"]) {
            album["type"] = nav(data, NAV.SUBTITLE);
            Object.assign(album, parse_song_runs(data["subtitle"]["runs"].slice(2)));
        }

        albums.push(album);
    }
    return albums;
}

export async function parse_library_podcasts(
    response: JsonDict,
    request_func: (params: string) => Promise<JsonDict>,
    limit: number | null
): Promise<JsonList> {
    const results = get_library_contents(response, NAV.GRID);
    if (!results) return [];
    const parse_func = (contents: JsonList) => parse_content_list(contents, parse_podcast);
    const podcasts = parse_func(results["items"].slice(1)); // skip first entry "Add podcast"

    if ("continuations" in results) {
        const remaining_limit = limit === null ? null : (limit - podcasts.length);
        podcasts.push(...(await get_continuations(results, "gridContinuation", remaining_limit, request_func, parse_func)));
    }

    return podcasts;
}

export async function parse_library_artists(
    response: JsonDict,
    request_func: (params: string) => Promise<JsonDict>,
    limit: number | null
): Promise<JsonList> {
    const results = get_library_contents(response, NAV.MUSIC_SHELF);
    if (!results) return [];
    const artists = parse_artists(results["contents"]);

    if ("continuations" in results) {
        const parse_func = (contents: JsonList) => parse_artists(contents);
        const remaining_limit = limit === null ? null : (limit - artists.length);
        artists.push(...(await get_continuations(results, "musicShelfContinuation", remaining_limit, request_func, parse_func)));
    }

    return artists;
}

export function pop_songs_random_mix(results: JsonDict | null): void {
    if (results && results["contents"] && results["contents"].length >= 2) {
        results["contents"].shift();
    }
}

export function parse_library_songs(response: JsonDict): JsonDict {
    const results = get_library_contents(response, NAV.MUSIC_SHELF);
    pop_songs_random_mix(results);
    return {
        "results": results,
        "parsed": results ? parse_playlist_items(results["contents"]) : null
    };
}

export function get_library_contents(response: JsonDict, renderer: string[]): JsonDict | null {
    const section = nav(response, [...NAV.SINGLE_COLUMN_TAB, ...NAV.SECTION_LIST], true);
    let contents = null;
    if (!section) {
        const num_tabs = nav(response, [...NAV.SINGLE_COLUMN, "tabs"])?.length || 0;
        const LIBRARY_TAB = num_tabs < 3 ? NAV.TAB_1_CONTENT : NAV.TAB_2_CONTENT;
        contents = nav(response, [...NAV.SINGLE_COLUMN, ...LIBRARY_TAB, ...NAV.SECTION_LIST_ITEM, ...renderer], true);
    } else {
        const results = find_object_by_key(section, "itemSectionRenderer");
        if (!results) {
            contents = nav(response, [...NAV.SINGLE_COLUMN_TAB, ...NAV.SECTION_LIST_ITEM, ...renderer], true);
        } else {
            contents = nav(results, [...NAV.ITEM_SECTION, ...renderer], true);
        }
    }
    return contents;
}
