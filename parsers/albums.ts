import { nav, to_int, find_object_by_key, parse_description_runs } from '../helpers';
import { JsonDict } from '../helpers';
import { parse_song_runs, parse_like_status } from './songs';
import { parse_artists_runs } from './artists';
import * as NAV from '../navigation';


export function parse_album_header(response: JsonDict): JsonDict {
    const header = nav(response, NAV.HEADER_DETAIL);
    const album: JsonDict = {
        "title": nav(header, NAV.TITLE_TEXT),
        "type": nav(header, NAV.SUBTITLE),
        "thumbnails": nav(header, NAV.THUMBNAIL_CROPPED),
        "isExplicit": nav(header, NAV.SUBTITLE_BADGE_LABEL, true) !== null,
    };

    if ("description" in header) {
        album["description"] = header.description.runs[0].text;
    }

    const album_info = parse_song_runs(header.subtitle.runs.slice(2));
    Object.assign(album, album_info);

    if (header.secondSubtitle.runs.length > 1) {
        album["trackCount"] = to_int(header.secondSubtitle.runs[0].text);
        album["duration"] = header.secondSubtitle.runs[2].text;
    } else {
        album["duration"] = header.secondSubtitle.runs[0].text;
    }

    const menu = nav(header, NAV.MENU);
    const toplevel = menu.topLevelButtons;
    album["audioPlaylistId"] = nav(toplevel, [0, "buttonRenderer", ...NAV.NAVIGATION_WATCH_PLAYLIST_ID], true);
    if (!album["audioPlaylistId"]) {
        album["audioPlaylistId"] = nav(toplevel, [0, "buttonRenderer", ...NAV.NAVIGATION_PLAYLIST_ID], true);
    }
    const service = nav(toplevel, [1, "buttonRenderer", "defaultServiceEndpoint"], true);
    if (service) {
        album["likeStatus"] = parse_like_status(service);
    }

    return album;
}

export function parse_album_header_2024(response: JsonDict): JsonDict {
    const header = nav(response, [...NAV.TWO_COLUMN_RENDERER, ...NAV.TAB_CONTENT, ...NAV.SECTION_LIST_ITEM, ...NAV.RESPONSIVE_HEADER]);
    const album: JsonDict = {
        "title": nav(header, NAV.TITLE_TEXT),
        "type": nav(header, NAV.SUBTITLE),
        "thumbnails": nav(header, NAV.THUMBNAILS),
        "isExplicit": nav(header, NAV.SUBTITLE_BADGE_LABEL, true) !== null,
    };

    const [description, description_runs] = parse_description_runs(
        nav(header, ["description", ...NAV.DESCRIPTION_SHELF, ...NAV.DESCRIPTION_RUN_LIST], true)
    );
    album["description"] = description;
    album["descriptionRuns"] = description_runs;


    const album_info = parse_song_runs(header.subtitle.runs.slice(2));
    const strapline_runs = nav(header, ["straplineTextOne", "runs"], true);
    album_info["artists"] = strapline_runs ? parse_artists_runs(strapline_runs) : null;
    Object.assign(album, album_info);

    if (header.secondSubtitle.runs.length > 1) {
        album["trackCount"] = to_int(header.secondSubtitle.runs[0].text);
        album["duration"] = header.secondSubtitle.runs[2].text;
    } else {
        album["duration"] = header.secondSubtitle.runs[0].text;
    }

    const buttons = header.buttons;
    const playButton = find_object_by_key(buttons, "musicPlayButtonRenderer");
    album["audioPlaylistId"] = nav(
        playButton,
        ["musicPlayButtonRenderer", "playNavigationEndpoint", ...NAV.WATCH_PID],
        true,
    );

    if (album["audioPlaylistId"] === null) {
        album["audioPlaylistId"] = nav(
            playButton,
            ["musicPlayButtonRenderer", "playNavigationEndpoint", ...NAV.WATCH_PLAYLIST_ID],
            true,
        );
    }

    const toggleButton = find_object_by_key(buttons, "toggleButtonRenderer");
    const service = nav(
        toggleButton,
        ["toggleButtonRenderer", "defaultServiceEndpoint"],
        true,
    );
    album["likeStatus"] = "INDIFFERENT";
    if (service) {
        album["likeStatus"] = parse_like_status(service);
    }

    return album;
}

export function parse_album_playlistid_if_exists(data: JsonDict | null): string | null {
    if (!data) return null;
    return nav(data, NAV.WATCH_PID, true) || nav(data, NAV.WATCH_PLAYLIST_ID, true);
}
