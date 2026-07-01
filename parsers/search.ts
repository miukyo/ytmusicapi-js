import { nav, to_int, find_objects_by_key } from '../helpers';
import { get_item_text, get_flex_column_item, parse_id_name, parse_menu_playlists } from './utils';
import { JsonDict, JsonList } from '../helpers';
import * as NAV from '../navigation';
import { parse_album_playlistid_if_exists } from './albums';
import { parse_artists_runs } from './artists';
import { parse_song_runs, parse_song_menu_data } from './songs';

const ALL_RESULT_TYPES = [
    "album",
    "artist",
    "playlist",
    "song",
    "video",
    "station",
    "profile",
    "podcast",
    "episode",
];

export function get_search_result_type(result_type_local: string | null, result_types_local: string[]): string | null {
    if (!result_type_local) return null;
    const lower_local = result_type_local.toLowerCase();

    if (!result_types_local.includes(lower_local)) {
        return "album";
    } else {
        return ALL_RESULT_TYPES[result_types_local.indexOf(lower_local)];
    }
}

export function parse_top_result(data: JsonDict, search_result_types: string[]): JsonDict {
    const result_type = get_search_result_type(nav(data, NAV.SUBTITLE), search_result_types);
    const category = nav(data, NAV.CARD_SHELF_TITLE, true) || "Top result";
    const search_result: JsonDict = { "category": category, "resultType": result_type };

    if (result_type === "artist") {
        const subscribers = nav(data, NAV.SUBTITLE2, true);
        if (subscribers) {
            search_result["subscribers"] = subscribers.split(" ")[0];
        }
        const artist_info = parse_song_runs(nav(data, ["title", "runs"]));
        Object.assign(search_result, artist_info);
    }

    if (result_type === "song" || result_type === "video") {
        const on_tap = data["onTap"];
        if (on_tap) {
            search_result["videoId"] = nav(on_tap, NAV.WATCH_VIDEO_ID, true);
            search_result["videoType"] = nav(on_tap, NAV.NAVIGATION_VIDEO_TYPE, true);
        }
    }

    if (["song", "video", "album"].includes(result_type || "")) {
        search_result["videoId"] = nav(data, ["onTap", ...NAV.WATCH_VIDEO_ID], true);
        search_result["videoType"] = nav(data, ["onTap", ...NAV.NAVIGATION_VIDEO_TYPE], true);

        search_result["title"] = nav(data, NAV.TITLE_TEXT);
        const runs = nav(data, ["subtitle", "runs"]);
        const song_info = parse_song_runs(runs.slice(2));
        Object.assign(search_result, song_info);
    }

    if (result_type === "album") {
        search_result["browseId"] = nav(data, [...NAV.TITLE, ...NAV.NAVIGATION_BROWSE_ID], true);
        const button_command = nav(data, ["buttons", 0, "buttonRenderer", "command"], true);
        search_result["playlistId"] = parse_album_playlistid_if_exists(button_command);
    }

    if (result_type === "playlist") {
        search_result["playlistId"] = nav(data, NAV.MENU_PLAYLIST_ID);
        search_result["title"] = nav(data, NAV.TITLE_TEXT);
        search_result["author"] = parse_artists_runs(nav(data, ["subtitle", "runs"]).slice(2));
    }

    if (result_type === "episode") {
        search_result["title"] = nav(data, NAV.TITLE_TEXT);
        search_result["videoId"] = nav(data, [...NAV.THUMBNAIL_OVERLAY_NAVIGATION, ...NAV.WATCH_VIDEO_ID]);
        search_result["videoType"] = nav(data, [...NAV.THUMBNAIL_OVERLAY_NAVIGATION, ...NAV.NAVIGATION_VIDEO_TYPE]);
        const runs = nav(data, NAV.SUBTITLE_RUNS).slice(2);
        search_result["date"] = runs[0].text;
        search_result["podcast"] = parse_id_name(runs[2]);
    }

    search_result["thumbnails"] = nav(data, NAV.THUMBNAILS, true);
    return search_result;
}

export function parse_search_result(data: JsonDict, result_type: string | null, category: string | null): JsonDict {
    const default_offset = (!result_type || result_type === "album") ? 2 : 0;
    const search_result: JsonDict = { "category": category };
    const video_type = nav(data, [...NAV.PLAY_BUTTON, "playNavigationEndpoint", ...NAV.NAVIGATION_VIDEO_TYPE], true);

    if (!result_type) {
        const browse_id = nav(data, NAV.NAVIGATION_BROWSE_ID, true);
        if (browse_id) {
            const mapping: Record<string, string> = {
                "VM": "playlist",
                "RD": "playlist",
                "VL": "playlist",
                "MPLA": "artist",
                "MPRE": "album",
                "MPSP": "podcast",
                "MPED": "episode",
                "UC": "artist",
            };
            const prefix = Object.keys(mapping).find(p => browse_id.startsWith(p));
            result_type = prefix ? mapping[prefix] : null;
        } else {
            const map: Record<string, string> = {
                "MUSIC_VIDEO_TYPE_ATV": "song",
                "MUSIC_VIDEO_TYPE_PODCAST_EPISODE": "episode",
            };
            result_type = map[video_type || ""] || "video";
        }
    }

    search_result["resultType"] = result_type;

    if (result_type !== "artist") {
        search_result["title"] = get_item_text(data, 0);
    }

    if (result_type === "artist") {
        search_result["artist"] = get_item_text(data, 0);
        parse_menu_playlists(data, search_result);
    } else if (result_type === "album") {
        search_result["type"] = get_item_text(data, 1);
        const play_navigation = nav(data, [...NAV.PLAY_BUTTON, "playNavigationEndpoint"], true);
        search_result["playlistId"] = parse_album_playlistid_if_exists(play_navigation);
    } else if (result_type === "playlist") {
        const flex_item = nav(get_flex_column_item(data, 1), NAV.TEXT_RUNS);
        const has_author = flex_item.length === default_offset + 3;
        const item_info_text = (get_item_text(data, 1, has_author ? 2 : 0) || "").split(" ");
        search_result["itemCount"] = (item_info_text.length >= 2 && item_info_text[1] === "songs") ? item_info_text[0] : null;
        if (search_result["itemCount"] && !isNaN(Number(search_result["itemCount"]))) {
            search_result["itemCount"] = to_int(search_result["itemCount"]);
        }
        search_result["author"] = !has_author ? null : get_item_text(data, 1, default_offset);
    } else if (result_type === "station") {
        search_result["videoId"] = nav(data, NAV.NAVIGATION_VIDEO_ID);
        search_result["playlistId"] = nav(data, NAV.NAVIGATION_PLAYLIST_ID);
    } else if (result_type === "profile") {
        search_result["name"] = get_item_text(data, 1, 2, true);
    } else if (result_type === "song") {
        search_result["album"] = null;
        Object.assign(search_result, parse_song_menu_data(data));
    } else if (result_type === "upload") {
        const browse_id = nav(data, NAV.NAVIGATION_BROWSE_ID, true);
        if (!browse_id) { // song result
            const flex_items = [0, 1].map(i => nav(get_flex_column_item(data, i), ["text", "runs"], true));
            if (flex_items[0]) {
                search_result["videoId"] = nav(flex_items[0][0], NAV.NAVIGATION_VIDEO_ID, true);
                search_result["playlistId"] = nav(flex_items[0][0], NAV.NAVIGATION_PLAYLIST_ID, true);
            }
            if (flex_items[1]) {
                Object.assign(search_result, parse_song_runs(flex_items[1]));
            }
            search_result["resultType"] = "song";
        } else {
            search_result["browseId"] = browse_id;
            if (browse_id.includes("artist")) {
                search_result["resultType"] = "artist";
            } else {
                const flex_item2 = get_flex_column_item(data, 1);
                // @ts-ignore
                const runs = flex_item2 ? flex_item2.text.runs.filter((_, i) => i % 2 === 0).map(r => r.text) : [];
                if (runs.length > 1) search_result["artist"] = runs[1];
                if (runs.length > 2) search_result["releaseDate"] = runs[2];
                search_result["resultType"] = "album";
            }
        }
    }

    if (["song", "video", "episode"].includes(result_type || "")) {
        search_result["videoId"] = nav(data, [...NAV.PLAY_BUTTON, "playNavigationEndpoint", "watchEndpoint", "videoId"], true);
        search_result["videoType"] = video_type;
    }

    if (["song", "video", "album"].includes(result_type || "")) {
        search_result["duration"] = null;
        search_result["year"] = null;
        const flex_item = get_flex_column_item(data, 1);
        if (!flex_item) throw new Error("Expected flex column item at index 1");
        // @ts-ignore
        const runs = [...flex_item.text.runs];
        const flex_item2 = get_flex_column_item(data, 2);
        if (flex_item2) {
            // @ts-ignore
            runs.push({ "text": "" }, ...flex_item2.text.runs);
        }
        const song_info = parse_song_runs(runs, true);
        Object.assign(search_result, song_info);
    }

    if (["artist", "album", "playlist", "profile", "podcast"].includes(result_type || "")) {
        search_result["browseId"] = nav(data, NAV.NAVIGATION_BROWSE_ID, true);
    }

    if (["song", "album"].includes(result_type || "")) {
        search_result["isExplicit"] = nav(data, NAV.BADGE_LABEL, true) !== null;
    }

    if (result_type === "episode") {
        const flex_item = get_flex_column_item(data, 1);
        // @ts-ignore
        const runs = nav(flex_item, NAV.TEXT_RUNS).slice(default_offset);
        const has_date = runs.length > 1;
        search_result["live"] = Boolean(nav(data, ["badges", 0, "liveBadgeRenderer"], true));
        if (has_date) {
            search_result["date"] = runs[0].text;
        }
        search_result["podcast"] = parse_id_name(runs[has_date ? 2 : 0]);
    }

    search_result["thumbnails"] = nav(data, NAV.THUMBNAILS, true);
    return search_result;
}

export function parse_search_results(results: JsonList, resultType: string | null = null, category: string | null = null): JsonList {
    return results.map(result => parse_search_result(result[NAV.MRLIR], resultType, category));
}

export function get_search_params(filter: string | null, scope: string | null, ignore_spelling: boolean): string | null {
    const filtered_param1 = "EgWKAQ";
    let params = null;
    if (!filter && !scope && !ignore_spelling) return null;

    if (scope === "uploads") params = "agIYAw%3D%3D";

    if (scope === "library") {
        if (filter) {
            return filtered_param1 + _get_param2(filter) + "AWoKEAUQCRADEAoYBA%3D%3D";
        } else {
            params = "agIYBA%3D%3D";
        }
    }

    if (!scope && filter) {
        if (filter === "playlists") {
            params = "Eg-KAQwIABAAGAAgACgB";
            if (!ignore_spelling) params += "MABqChAEEAMQCRAFEAo%3D";
            else params += "MABCAggBagoQBBADEAkQBRAK";
        } else if (filter.includes("playlists")) {
            let param1 = "EgeKAQQoA";
            let param2 = filter === "featured_playlists" ? "Dg" : "EA";
            let param3;
            if (!ignore_spelling) param3 = "BagwQDhAKEAMQBBAJEAU%3D";
            else param3 = "BQgIIAWoMEA4QChADEAQQCRAF";
            return param1 + param2 + param3;
        } else {
            let param3;
            if (!ignore_spelling) param3 = "AWoMEA4QChADEAQQCRAF";
            else param3 = "AUICCAFqDBAOEAoQAxAEEAkQBQ%3D%3D";
            return filtered_param1 + _get_param2(filter) + param3;
        }
    }

    if (!scope && !filter && ignore_spelling) {
        params = "EhGKAQ4IARABGAEgASgAOAFAAUICCAE%3D";
    }

    return params;
}

function _get_param2(filter: string): string {
    const filter_params: Record<string, string> = {
        "songs": "II",
        "videos": "IQ",
        "albums": "IY",
        "artists": "Ig",
        "playlists": "Io",
        "profiles": "JY",
        "podcasts": "JQ",
        "episodes": "JI",
    };
    return filter_params[filter];
}

export function parse_search_suggestions(results: JsonDict, detailed_runs: boolean): string[] | JsonList {
    const suggestions_section = results.contents?.[0]?.searchSuggestionsSectionRenderer?.contents;
    if (!suggestions_section) return [];

    const raw_suggestions = suggestions_section;
    const suggestions = [];

    for (const raw_suggestion of raw_suggestions) {
        let feedback_token = null;
        let suggestion_content;

        if ("historySuggestionRenderer" in raw_suggestion) {
            suggestion_content = raw_suggestion.historySuggestionRenderer;
            feedback_token = nav(suggestion_content, ["serviceEndpoint", "feedbackEndpoint", "feedbackToken"], true);
        } else {
            suggestion_content = raw_suggestion.searchSuggestionRenderer;
        }

        const text = suggestion_content.navigationEndpoint.searchEndpoint.query;
        const runs = suggestion_content.suggestion.runs;

        if (detailed_runs) {
            suggestions.push({
                "text": text,
                "runs": runs,
                "fromHistory": feedback_token !== null,
                "feedbackToken": feedback_token,
            });
        } else {
            suggestions.push(text);
        }
    }

    return suggestions;
}
