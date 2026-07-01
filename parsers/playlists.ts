import { nav, to_int, sum_total_duration } from '../helpers';
import { JsonDict, JsonList } from '../helpers'; // Use helpers types
import * as NAV from '../navigation';
import {
    parse_song_menu_data,
    parse_song_run,
    parse_song_artists,
    parse_song_album
} from './songs';
import { parse_duration, get_flex_column_item, get_item_text, get_fixed_column_item } from './utils';

export function parse_playlist_items(
    results: JsonList,
    is_album: boolean = false,
    is_collaborative: boolean = false
): JsonList {
    const songs = [];
    for (const result of results) {
        if (!result[NAV.MRLIR]) continue;
        const data = result[NAV.MRLIR];
        const song = parse_playlist_item(data, is_album, is_collaborative);
        if (song) songs.push(song);
    }
    return songs;
}

export function parse_playlist_item(
    data: JsonDict,
    is_album: boolean = false,
    is_collaborative: boolean = false
): JsonDict | null {
    let videoId = null;
    let setVideoId = null;
    let like = null;
    let creditsBrowseId = null;

    if ("menu" in data) {
        for (const item of nav(data, NAV.MENU_ITEMS)) {
            if ("menuServiceItemRenderer" in item) {
                const menu_service = nav(item, NAV.MENU_SERVICE);
                if ("playlistEditEndpoint" in menu_service) {
                    setVideoId = nav(menu_service, ["playlistEditEndpoint", "actions", 0, "setVideoId"], true);
                    videoId = nav(menu_service, ["playlistEditEndpoint", "actions", 0, "removedVideoId"], true);
                }
            } else if (NAV.MNIR in item) {
                const maybe_credits_browse_id = nav(item, [NAV.MNIR, ...NAV.NAVIGATION_BROWSE_ID], true);
                if (maybe_credits_browse_id && maybe_credits_browse_id.startsWith("MPTC")) {
                    creditsBrowseId = maybe_credits_browse_id;
                }
            }
        }
    }

    const song_menu_data = { "inLibrary": null, "pinnedToListenAgain": null };
    Object.assign(song_menu_data, parse_song_menu_data(data));

    if (nav(data, NAV.PLAY_BUTTON, true)) {
        const play_button = nav(data, NAV.PLAY_BUTTON);
        if ("playNavigationEndpoint" in play_button) {
            videoId = play_button.playNavigationEndpoint.watchEndpoint.videoId;
            if ("menu" in data) {
                like = nav(data, NAV.MENU_LIKE_STATUS, true);
            }
        }
    }

    let isAvailable = true;
    if ("musicItemRendererDisplayPolicy" in data) {
        isAvailable = data.musicItemRendererDisplayPolicy !== "MUSIC_ITEM_RENDERER_DISPLAY_POLICY_GREY_OUT";
    }

    const use_preset_columns = (!isAvailable || is_album) ? true : null;

    let title_index: number | null = use_preset_columns ? 0 : null;
    let artist_index: number | null = use_preset_columns ? 1 : null;
    let duration_index: number | null = null;
    let album_index: number | null = is_collaborative ? 3 : (use_preset_columns ? 2 : null);
    const user_channel_indexes: number[] = [];
    let unrecognized_index: number | null = null;

    // Fix: Accessing flexColumns safely
    const flexColumns = data.flexColumns || [];
    for (let index = 0; index < flexColumns.length; index++) {
        const flex_column_item = get_flex_column_item(data, index);
        if (!flex_column_item) continue; // Should not happen if flexColumns exists, unless helpers return null

        const navigation_endpoint = nav(flex_column_item, [...NAV.TEXT_RUN, "navigationEndpoint"], true);

        if (!navigation_endpoint) {
            const run = nav(flex_column_item, NAV.TEXT_RUN, true);
            if (run && "text" in run) {
                const parsed = parse_song_run(run);
                if (parsed.type === "duration") {
                    duration_index = index;
                } else {
                    if (unrecognized_index === null) unrecognized_index = index;
                }
            }
            continue;
        }

        if ("watchEndpoint" in navigation_endpoint) {
            title_index = index;
        } else if ("browseEndpoint" in navigation_endpoint) {
            const page_type = nav(navigation_endpoint, ["browseEndpoint", "browseEndpointContextSupportedConfigs", "browseEndpointContextMusicConfig", "pageType"], true);

            if (page_type === "MUSIC_PAGE_TYPE_ARTIST" || page_type === "MUSIC_PAGE_TYPE_UNKNOWN") {
                artist_index = index;
            } else if (["MUSIC_PAGE_TYPE_ALBUM", "MUSIC_PAGE_TYPE_AUDIOBOOK"].includes(page_type)) {
                album_index = index;
            } else if (page_type === "MUSIC_PAGE_TYPE_USER_CHANNEL") {
                user_channel_indexes.push(index);
            } else if (page_type === "MUSIC_PAGE_TYPE_NON_MUSIC_AUDIO_TRACK_PAGE") {
                title_index = index;
            }
        }
    }

    if (artist_index === null && unrecognized_index !== null) {
        artist_index = unrecognized_index;
    }

    if (artist_index === null && user_channel_indexes.length > 0) {
        artist_index = user_channel_indexes[user_channel_indexes.length - 1]; // Python: user_channel_indexes[-1]
    }

    const title = title_index !== null ? get_item_text(data, title_index) : null;
    if (title === "Song deleted") return null;

    const artists = artist_index !== null ? parse_song_artists(data, artist_index) : null;
    const album = album_index !== null ? parse_song_album(data, album_index) : null;

    // Python: views = get_item_text(data, 2) if is_album else None
    // get_item_text can take multiple args in python, but my implementation in utils.ts handles it.
    const views = is_album ? get_item_text(data, 2) : null;

    let duration: string | null = duration_index ? get_item_text(data, duration_index) : null;

    if ("fixedColumns" in data) {
        // ... logic for fixedColumns ...
        if (nav(get_fixed_column_item(data, 0), ["text", "simpleText"], true)) {
            duration = nav(get_fixed_column_item(data, 0), ["text", "simpleText"]);
        } else {
            duration = nav(get_fixed_column_item(data, 0), NAV.TEXT_RUN_TEXT);
        }
    }

    const thumbnails = nav(data, NAV.THUMBNAILS, true);
    const isExplicit = nav(data, NAV.BADGE_LABEL, true) !== null;
    const videoType = nav(data, [...NAV.MENU_ITEMS, 0, NAV.MNIR, "navigationEndpoint", ...NAV.NAVIGATION_VIDEO_TYPE], true);

    const voting_status = nav(data, NAV.ENGAGEMENT_BAR, true);
    const community_vote_status = voting_status === null ? null : {
        "netVoteValue": voting_status.votes,
        "status": voting_status.status,
    };

    const song: JsonDict = {
        "videoId": videoId,
        "title": title,
        "artists": artists,
        "album": album,
        "likeStatus": like,
        ...song_menu_data,
        "thumbnails": thumbnails,
        "isAvailable": isAvailable,
        "isExplicit": isExplicit,
        "videoType": videoType,
        "views": views,
        "communityVoteStatus": community_vote_status
    };

    if (is_album && isAvailable) {
        // Python: int(nav(data, ["index", "runs", 0, "text"]))
        song["trackNumber"] = parseInt(nav(data, ["index", "runs", 0, "text"]));
    }

    if (duration) {
        song["duration"] = duration;
        song["duration_seconds"] = parse_duration(duration);
    }

    if (setVideoId) {
        song["setVideoId"] = setVideoId;
    }

    if (creditsBrowseId) {
        song["creditsBrowseId"] = creditsBrowseId;
    }

    return song;
}
