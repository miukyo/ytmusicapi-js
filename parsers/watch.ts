import { nav, JsonDict, JsonList } from '../helpers';
import * as NAV from '../navigation';
import { parse_like_status } from './songs';
import { parse_song_menu_data, parse_song_runs } from './songs';

export function parse_watch_playlist(results: JsonList): JsonList {
    const tracks: JsonList = [];
    const PPVWR = "playlistPanelVideoWrapperRenderer";
    const PPVR = "playlistPanelVideoRenderer";
    for (const result of results) {
        let counterpart = null;
        let active_result = result;
        if (PPVWR in active_result) {
            counterpart = active_result[PPVWR]["counterpart"][0]["counterpartRenderer"][PPVR];
            active_result = active_result[PPVWR]["primaryRenderer"];
        }
        if (!(PPVR in active_result)) {
            continue;
        }
        const data = active_result[PPVR];
        if ("unplayableText" in data) {
            continue;
        }

        const track = parse_watch_track(data);
        if (counterpart) {
            track["counterpart"] = parse_watch_track(counterpart);
        }
        tracks.push(track);
    }
    return tracks;
}

export function parse_watch_track(data: JsonDict): JsonDict {
    let like_status = null;
    const menu_items = nav(data, NAV.MENU_ITEMS, true) || [];
    for (const item of menu_items) {
        if (NAV.TOGGLE_MENU in item) {
            const service = item[NAV.TOGGLE_MENU]["defaultServiceEndpoint"];
            if ("likeEndpoint" in service) {
                like_status = parse_like_status(service);
            }
        }
    }

    const track: JsonDict = {
        "videoId": data["videoId"],
        "title": nav(data, NAV.TITLE_TEXT),
        "length": nav(data, ["lengthText", "runs", 0, "text"], true),
        "thumbnail": nav(data, NAV.THUMBNAIL),
        "likeStatus": like_status,
        "videoType": nav(data, ["navigationEndpoint", ...NAV.NAVIGATION_VIDEO_TYPE], true),
    };

    Object.assign(track, {
        "inLibrary": null,
        "feedbackTokens": null,
        "pinnedToListenAgain": null,
        "listenAgainFeedbackTokens": null,
    }, parse_song_menu_data(data));

    const longBylineText = nav(data, ["longBylineText"], true);
    if (longBylineText) {
        const song_info = parse_song_runs(longBylineText["runs"]);
        Object.assign(track, song_info);
    }

    return track;
}

export function get_tab_browse_ids(watchNextRenderer: JsonDict): Record<string, string> {
    const browse_ids: Record<string, string> = {};
    for (const tab of watchNextRenderer["tabs"]) {
        if ("unselectable" in tab["tabRenderer"]) {
            continue;
        }

        const browse_endpoint = nav(tab, ["tabRenderer", "endpoint", "browseEndpoint"], true);
        if (browse_endpoint) {
            const page_type = nav(browse_endpoint, NAV.PAGE_TYPE);
            browse_ids[page_type] = browse_endpoint["browseId"];
        }
    }
    return browse_ids;
}
