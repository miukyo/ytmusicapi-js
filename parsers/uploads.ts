import { nav, JsonDict, JsonList } from '../helpers';
import * as NAV from '../navigation';
import { parse_song_album, parse_song_artists } from './songs';
import { get_item_text, get_fixed_column_item, parse_duration } from './utils';

export function parse_uploaded_items(results: JsonList): JsonList {
    const songs: JsonList = [];
    for (const result of results) {
        const data = result[NAV.MRLIR];
        if (!data || !("menu" in data)) continue;

        const entityId = nav(
            data,
            [
                ...NAV.MENU_ITEMS,
                -1,
                NAV.MNIR,
                "navigationEndpoint",
                "confirmDialogEndpoint",
                "content",
                "confirmDialogRenderer",
                "confirmButton",
                "buttonRenderer",
                "command",
                "musicDeletePrivatelyOwnedEntityCommand",
                "entityId",
            ],
            true
        );

        const videoId = nav(data, [...NAV.MENU_ITEMS, 0, ...NAV.MENU_SERVICE])["queueAddEndpoint"]["queueTarget"]["videoId"];
        const title = get_item_text(data, 0);
        const like = nav(data, NAV.MENU_LIKE_STATUS, true);
        const thumbnails = "thumbnail" in data ? nav(data, NAV.THUMBNAILS, true) : null;
        let duration = null;

        if ("fixedColumns" in data) {
            const fixed_item = get_fixed_column_item(data, 0);
            if (fixed_item) {
                duration = nav(fixed_item, NAV.TEXT_RUN_TEXT, true);
            }
        }

        const song: JsonDict = {
            "entityId": entityId,
            "videoId": videoId,
            "title": title,
            "duration": duration,
            "duration_seconds": parse_duration(duration),
            "artists": parse_song_artists(data, 1),
            "album": parse_song_album(data, 2),
            "likeStatus": like,
            "thumbnails": thumbnails,
        };

        songs.push(song);
    }
    return songs;
}
