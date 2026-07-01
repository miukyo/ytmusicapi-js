import { nav } from '../helpers';
import { JsonDict, JsonList } from '../helpers';
import * as NAV from '../navigation';
import { parse_song_flat } from './songs';
import { parse_episode, parse_episode_flat } from './podcasts';
import { parse_id_name, get_flex_column_item } from './utils';

export const TRENDS: Record<string, string> = {
    "ARROW_DROP_UP": "up",
    "ARROW_DROP_DOWN": "down",
    "ARROW_CHART_NEUTRAL": "neutral"
};

export function parse_chart_song(data: JsonDict): JsonDict {
    const parsed = parse_song_flat(data, true);
    Object.assign(parsed, parse_ranking(data, false));
    return parsed;
}

export function parse_trending_item(data: JsonDict): JsonDict {
    const video_type = nav(data, [...NAV.PLAY_BUTTON, "playNavigationEndpoint", ...NAV.NAVIGATION_VIDEO_TYPE], true);
    if (video_type === "MUSIC_VIDEO_TYPE_PODCAST_EPISODE") {
        return parse_episode_flat(data);
    }
    return parse_song_flat(data, true);
}

export function parse_chart_playlist(data: JsonDict): JsonDict {
    return {
        "title": nav(data, NAV.TITLE_TEXT),
        "playlistId": nav(data, [...NAV.TITLE, ...NAV.NAVIGATION_BROWSE_ID]).substring(2),
        "thumbnails": nav(data, NAV.THUMBNAIL_RENDERER),
    };
}

export function parse_chart_episode(data: JsonDict): JsonDict {
    const episode = parse_episode(data);
    delete episode["index"];
    episode["podcast"] = parse_id_name(nav(data, ["secondTitle", "runs", 0]));
    episode["duration"] = nav(data, ["playbackProgress", "playbackProgressRenderer", "durationText", ...NAV.RUN_TEXT], true);
    return episode;
}

export function parse_chart_artist(data: JsonDict): JsonDict {
    const subscribers_item = get_flex_column_item(data, 1);
    let subscribers = null;
    if (subscribers_item) {
        const text = nav(subscribers_item, NAV.TEXT_RUN_TEXT, true);
        if (text) subscribers = text.split(" ")[0];
    }

    const parsed: JsonDict = {
        "title": nav(get_flex_column_item(data, 0), NAV.TEXT_RUN_TEXT),
        "browseId": nav(data, NAV.NAVIGATION_BROWSE_ID),
        "subscribers": subscribers,
        "thumbnails": nav(data, NAV.THUMBNAILS),
    };
    Object.assign(parsed, parse_ranking(data, true));
    return parsed;
}

export function parse_ranking(data: JsonDict, none_if_absent: boolean): JsonDict {
    const trend_icon_type = nav(
        data,
        ["customIndexColumn", "musicCustomIndexColumnRenderer", ...NAV.ICON_TYPE],
        none_if_absent
    );
    return {
        "rank": nav(
            data,
            ["customIndexColumn", "musicCustomIndexColumnRenderer", ...NAV.TEXT_RUN_TEXT],
            none_if_absent
        ),
        "trend": trend_icon_type !== null && trend_icon_type in TRENDS ? TRENDS[trend_icon_type] : null,
    };
}
