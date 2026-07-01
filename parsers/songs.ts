import { nav } from '../helpers';
import { JsonDict, JsonList } from '../helpers';
import {
    get_flex_column_item,
    parse_duration,
    get_item_text
} from './utils';
import { parse_artists_runs } from './artists';
import { DOT_SEPARATOR_RUN } from './constants';
import * as NAV from '../navigation';

export function parse_song_artists(data: JsonDict, index: number): JsonList {
    const flex_item = get_flex_column_item(data, index);
    if (!flex_item) {
        return [];
    } else {
        // @ts-ignore
        const runs = flex_item.text.runs;
        return parse_artists_runs(runs);
    }
}

export function parse_song_run(run: JsonDict): JsonDict {
    const text = run.text;

    if ("navigationEndpoint" in run) { // artist or album
        const item = { "name": text, "id": nav(run, NAV.NAVIGATION_BROWSE_ID, true) };

        if (item.id && (item.id.startsWith("MPRE") || item.id.includes("release_detail"))) { // album
            return { "type": "album", "data": item };
        } else { // artist
            return { "type": "artist", "data": item };
        }
    } else {
        if (/^\d([^ ])* [^ ]*$/.test(text)) {
            return { "type": "views", "data": text.split(" ")[0] };
        } else if (/^(\d+:)*\d+:\d+$/.test(text)) {
            return { "type": "duration", "data": text };
        } else if (/^\d{4}$/.test(text)) {
            return { "type": "year", "data": text };
        } else {
            return { "type": "artist", "data": { "name": text, "id": null } };
        }
    }
}

export function parse_song_runs(runs: JsonList, skip_type_spec: boolean = false): JsonDict {
    const parsed: JsonDict = {};

    if (
        skip_type_spec &&
        runs.length > 2 &&
        parse_song_run(runs[0]).type === "artist" &&
        runs[1].text === DOT_SEPARATOR_RUN.text &&
        parse_song_run(runs[2]).type === "artist"
    ) {
        runs = runs.slice(2);
    }

    for (let i = 0; i < runs.length; i++) {
        const run = runs[i];
        if (i % 2) continue;

        const parsed_run = parse_song_run(run);
        const data = parsed_run.data;

        switch (parsed_run.type) {
            case "album":
                parsed["album"] = data;
                break;
            case "artist":
                if (!parsed["artists"]) parsed["artists"] = [];
                parsed["artists"].push(data);
                break;
            case "views":
                parsed["views"] = data;
                break;
            case "duration":
                parsed["duration"] = data;
                parsed["duration_seconds"] = parse_duration(data);
                break;
            case "year":
                parsed["year"] = data;
                break;
        }
    }

    return parsed;
}

export function parse_song(result: JsonDict): JsonDict {
    const song: JsonDict = {
        "title": nav(result, NAV.TITLE_TEXT),
        "videoId": nav(result, NAV.NAVIGATION_VIDEO_ID),
        "playlistId": nav(result, NAV.NAVIGATION_PLAYLIST_ID, true),
        "thumbnails": nav(result, NAV.THUMBNAIL_RENDERER),
    };
    const runs = nav(result, NAV.SUBTITLE_RUNS);
    Object.assign(song, parse_song_runs(runs, true));
    return song;
}

export function parse_song_flat(data: JsonDict, with_playlist_id: boolean = false): JsonDict {
    const columns = data.flexColumns.map((_: any, i: number) => get_flex_column_item(data, i));
    const song: JsonDict = {
        "title": nav(columns[0], NAV.TEXT_RUN_TEXT),
        "videoId": nav(columns[0], [...NAV.TEXT_RUN, ...NAV.NAVIGATION_VIDEO_ID], true),
        "videoType": nav(data, [...NAV.PLAY_BUTTON, "playNavigationEndpoint", ...NAV.NAVIGATION_VIDEO_TYPE], true),
        "thumbnails": nav(data, NAV.THUMBNAILS),
        "isExplicit": nav(data, NAV.BADGE_LABEL, true) !== null,
    };

    if (with_playlist_id) {
        song["playlistId"] = nav(data, [...NAV.PLAY_BUTTON, "playNavigationEndpoint", ...NAV.WATCH_PLAYLIST_ID]);
    }

    const runs = nav(columns[1], NAV.TEXT_RUNS);
    Object.assign(song, parse_song_runs(runs, true));

    if (columns.length > 2 && columns[2] !== null && "navigationEndpoint" in nav(columns[2], NAV.TEXT_RUN)) {
        song["album"] = {
            "name": nav(columns[2], NAV.TEXT_RUN_TEXT),
            "id": nav(columns[2], [...NAV.TEXT_RUN, ...NAV.NAVIGATION_BROWSE_ID]),
        };
    }

    return song;
}

export function parse_song_album(data: JsonDict, index: number): JsonDict | null {
    const flex_item = get_flex_column_item(data, index);
    const browse_id = nav(flex_item, [...NAV.TEXT_RUN, ...NAV.NAVIGATION_BROWSE_ID], true);
    return !flex_item ? null : { "name": get_item_text(data, index), "id": browse_id };
}

export function parse_song_menu_data(data: JsonDict): JsonDict {
    if (!("menu" in data)) return {};

    const song_data: JsonDict = {};
    const menu_items = nav(data, NAV.MENU_ITEMS);

    const get_feedback_token = (menu_item: any, endpoint_type: string) => {
        return nav(menu_item, [endpoint_type, ...NAV.FEEDBACK_TOKEN], true);
    };

    for (const item of menu_items) {
        const menu_item = nav(item, [NAV.TOGGLE_MENU], true) || nav(item, ["menuServiceItemRenderer"], true);
        if (menu_item === null) continue;

        song_data["inLibrary"] = song_data["inLibrary"] || false;
        song_data["pinnedToListenAgain"] = song_data["pinnedToListenAgain"] || false;

        const current_icon_type = nav(menu_item, ["defaultIcon", "iconType"], true) || nav(menu_item, ["icon", "iconType"], true);

        switch (current_icon_type) {
            case "KEEP":
                song_data["listenAgainFeedbackTokens"] = {
                    "pin": get_feedback_token(menu_item, "defaultServiceEndpoint"),
                    "unpin": get_feedback_token(menu_item, "toggledServiceEndpoint"),
                };
                break;
            case "KEEP_OFF":
                song_data["pinnedToListenAgain"] = true;
                song_data["listenAgainFeedbackTokens"] = {
                    "pin": get_feedback_token(menu_item, "toggledServiceEndpoint"),
                    "unpin": get_feedback_token(menu_item, "defaultServiceEndpoint"),
                };
                break;
            case "BOOKMARK_BORDER":
                song_data["feedbackTokens"] = {
                    "add": get_feedback_token(menu_item, "defaultServiceEndpoint"),
                    "remove": get_feedback_token(menu_item, "toggledServiceEndpoint"),
                };
                break;
            case "BOOKMARK":
                song_data["inLibrary"] = true;
                song_data["feedbackTokens"] = {
                    "add": get_feedback_token(menu_item, "toggledServiceEndpoint"),
                    "remove": get_feedback_token(menu_item, "defaultServiceEndpoint"),
                };
                break;
            case "REMOVE_FROM_HISTORY":
                song_data["feedbackToken"] = get_feedback_token(menu_item, "serviceEndpoint");
                break;
        }
    }

    return song_data;
}

export function parse_like_status(service: JsonDict): string {
    const status = ["LIKE", "INDIFFERENT"];
    const current = service.likeEndpoint.status;
    const index = status.indexOf(current);
    return status[(index - 1 + status.length) % status.length];
}
