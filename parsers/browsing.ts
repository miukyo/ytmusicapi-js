import { nav } from '../helpers';
import { JsonDict, JsonList } from '../helpers';
import * as NAV from '../navigation';
import { parse_album_playlistid_if_exists } from './albums';
import { parse_artists_runs } from './artists';
import { parse_episode, parse_podcast } from './podcasts';
import { parse_song, parse_song_flat, parse_song_runs } from './songs';
import { parse_id_name, get_flex_column_item, get_dot_separator_index } from './utils';

export function parse_mixed_content(rows: JsonList): JsonList {
    const items = [];
    for (const row of rows) {
        let title, contents = [];
        if (NAV.DESCRIPTION_SHELF[0] in row) {
            const results = nav(row, NAV.DESCRIPTION_SHELF);
            title = nav(results, ["header", ...NAV.RUN_TEXT]);
            contents = nav(results, NAV.DESCRIPTION);
        } else {
            const results = row[Object.keys(row)[0]];
            if (!("contents" in results)) continue;

            title = nav(results, [...NAV.CAROUSEL_TITLE, "text"]);
            for (const result of results["contents"]) {
                const data = nav(result, [NAV.MTRIR], true);
                let content = null;
                if (data) {
                    const page_type = nav(data, [...NAV.TITLE, ...NAV.NAVIGATION_BROWSE, ...NAV.PAGE_TYPE], true);
                    if (page_type === null) {
                        if (nav(data, NAV.NAVIGATION_WATCH_PLAYLIST_ID, true) !== null) {
                            content = parse_watch_playlist(data);
                        } else {
                            content = parse_song(data);
                        }
                    } else if (["MUSIC_PAGE_TYPE_ALBUM", "MUSIC_PAGE_TYPE_AUDIOBOOK"].includes(page_type)) {
                        content = parse_album(data);
                    } else if (["MUSIC_PAGE_TYPE_ARTIST", "MUSIC_PAGE_TYPE_USER_CHANNEL"].includes(page_type)) {
                        content = parse_related_artist(data);
                    } else if (page_type === "MUSIC_PAGE_TYPE_PLAYLIST") {
                        content = parse_playlist(data);
                    } else if (page_type === "MUSIC_PAGE_TYPE_PODCAST_SHOW_DETAIL_PAGE") {
                        content = parse_podcast(data);
                    }
                } else {
                    const dataResponsive = nav(result, [NAV.MRLIR], true);
                    if (dataResponsive) {
                        content = parse_song_flat(dataResponsive);
                    } else {
                        const dataMultiRow = nav(result, [NAV.MMRIR], true);
                        if (dataMultiRow) {
                            content = parse_episode(dataMultiRow);
                        } else {
                            continue;
                        }
                    }
                }
                if (content) contents.push(content);
            }
        }
        items.push({ "title": title, "contents": contents });
    }
    return items;
}

export function parse_content_list(results: JsonList, parse_func: (data: JsonDict) => JsonDict, key: string = NAV.MTRIR): JsonList {
    const contents = [];
    for (const result of results) {
        contents.push(parse_func(result[key]));
    }
    return contents;
}

function _parse_album_single_subtitle(result: JsonDict, album_or_single: JsonDict): JsonDict {
    const type_or_year = nav(result, NAV.SUBTITLE, true);
    if (type_or_year) {
        if (/^\d+$/.test(type_or_year)) {
            album_or_single["year"] = type_or_year;
        } else {
            album_or_single["type"] = type_or_year;
            const year = nav(result, NAV.SUBTITLE2, true);
            if (year && /^\d+$/.test(year)) {
                album_or_single["year"] = year;
            }
        }
    }
    return album_or_single;
}

export function parse_album(result: JsonDict): JsonDict {
    const runs = nav(result, ["subtitle", "runs"], true) || [];
    const album: JsonDict = {
        "title": nav(result, NAV.TITLE_TEXT),
        "artists": runs.filter((x: any) => "navigationEndpoint" in x).map(parse_id_name),
        "browseId": nav(result, [...NAV.TITLE, ...NAV.NAVIGATION_BROWSE_ID]),
        "audioPlaylistId": parse_album_playlistid_if_exists(nav(result, NAV.THUMBNAIL_OVERLAY_NAVIGATION, true)),
        "thumbnails": nav(result, NAV.THUMBNAIL_RENDERER),
        "isExplicit": nav(result, NAV.SUBTITLE_BADGE_LABEL, true) !== null,
    };

    return _parse_album_single_subtitle(result, album);
}

export function parse_single(result: JsonDict): JsonDict {
    const single: JsonDict = {
        "title": nav(result, NAV.TITLE_TEXT),
        "browseId": nav(result, [...NAV.TITLE, ...NAV.NAVIGATION_BROWSE_ID]),
        "thumbnails": nav(result, NAV.THUMBNAIL_RENDERER),
    };

    return _parse_album_single_subtitle(result, single);
}


export function parse_watch_playlist(data: JsonDict): JsonDict {
    return {
        "title": nav(data, NAV.TITLE_TEXT),
        "playlistId": nav(data, NAV.NAVIGATION_WATCH_PLAYLIST_ID),
        "thumbnails": nav(data, NAV.THUMBNAIL_RENDERER),
    };
}

export function parse_playlist(data: JsonDict): JsonDict {
    const playlist: JsonDict = {
        "title": nav(data, NAV.TITLE_TEXT, true),
        "playlistId": nav(data, [...NAV.TITLE, ...NAV.NAVIGATION_BROWSE_ID]).substring(2),
        "thumbnails": nav(data, NAV.THUMBNAIL_RENDERER),
    };
    const subtitle = data.subtitle;
    if ("runs" in subtitle) {
        playlist["description"] = subtitle.runs.map((run: any) => run.text).join("");
        if (subtitle.runs.length === 3 && /\d+ /.test(nav(data, NAV.SUBTITLE2))) {
            playlist["count"] = nav(data, NAV.SUBTITLE2).split(" ")[0];
            playlist["author"] = parse_artists_runs(subtitle.runs.slice(0, 1));
        }
    }
    return playlist;
}

export function parse_related_artist(data: JsonDict): JsonDict {
    let subscribers = nav(data, NAV.SUBTITLE, true);
    if (subscribers) {
        subscribers = subscribers.split(" ")[0];
    }
    return {
        "title": nav(data, NAV.TITLE_TEXT),
        "browseId": nav(data, [...NAV.TITLE, ...NAV.NAVIGATION_BROWSE_ID]),
        "subscribers": subscribers,
        "thumbnails": nav(data, NAV.THUMBNAIL_RENDERER),
    };
}

export function parse_video(result: JsonDict): JsonDict {
    const runs = nav(result, NAV.SUBTITLE_RUNS);
    const artists_len = get_dot_separator_index(runs);
    let videoId = nav(result, NAV.NAVIGATION_VIDEO_ID, true);

    if (!videoId) {
        const menuItems = nav(result, NAV.MENU_ITEMS);
        if (menuItems) {
            for (const entry of menuItems) {
                const vid = nav(entry, [...NAV.MENU_SERVICE, ...NAV.QUEUE_VIDEO_ID], true);
                if (vid) {
                    videoId = vid;
                    break;
                }
            }
        }
    }

    return {
        "title": nav(result, NAV.TITLE_TEXT),
        "videoId": videoId,
        "artists": parse_artists_runs(runs.slice(0, artists_len)),
        "playlistId": nav(result, NAV.NAVIGATION_PLAYLIST_ID, true),
        "thumbnails": nav(result, NAV.THUMBNAIL_RENDERER, true),
        "views": runs[runs.length - 1].text.split(" ")[0]
    };
}
