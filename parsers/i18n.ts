import { nav } from '../helpers';
import { JsonDict, JsonList } from '../helpers';
import * as NAV from '../navigation';
import {
    parse_album,
    parse_single,
    parse_video,
    parse_playlist,
    parse_related_artist,
    parse_content_list
} from './browsing';
import { parse_episode, parse_podcast } from './podcasts';

const ENGLISH_TRANSLATIONS: Record<string, string> = {
    "shows": "Audiobooks and shows",
    "related": "fans might also like",
    "episodes": "latest episodes",
    "singles & eps": "singles & eps",
    "performed_by": "Performed by",
    "written_by": "Written by",
    "produced_by": "Produced by",
    "music_metadata_provided_by": "Music metadata provided by"
};

function _(text: string): string {
    return ENGLISH_TRANSLATIONS[text] || text;
}

export class Parser {
    constructor() { } // No lang param for now

    get_search_result_types(): string[] {
        return [
            _("album"),
            _("artist"),
            _("playlist"),
            _("song"),
            _("video"),
            _("station"),
            _("profile"),
            _("podcast"),
            _("episode"),
        ];
    }

    get_song_credit_section_map(): JsonDict {
        return {
            [_("performed_by")]: "performed_by",
            [_("written_by")]: "written_by",
            [_("produced_by")]: "produced_by",
            [_("music_metadata_provided_by")]: "music_metadata_provided_by",
        };
    }


    parse_channel_contents(results: JsonList): JsonDict {
        const categories: [string, string, any, string][] = [
            ["albums", _("albums"), parse_album, NAV.MTRIR],
            ["singles", _("singles & eps"), parse_single, NAV.MTRIR],
            ["shows", _("shows"), parse_album, NAV.MTRIR],
            ["videos", _("videos"), parse_video, NAV.MTRIR],
            ["playlists", _("playlists"), parse_playlist, NAV.MTRIR],
            ["related", _("related"), parse_related_artist, NAV.MTRIR],
            ["episodes", _("episodes"), parse_episode, NAV.MMRIR],
            ["podcasts", _("podcasts"), parse_podcast, NAV.MTRIR],
        ];

        const artist: JsonDict = {};
        for (const [category, category_local, category_parser, category_key] of categories) {
            const data = results.filter((r: any) =>
                "musicCarouselShelfRenderer" in r &&
                nav(r, [...NAV.CAROUSEL, ...NAV.CAROUSEL_TITLE]).text.toLowerCase() === category_local.toLowerCase()
            ).map((r: any) => r.musicCarouselShelfRenderer);

            if (data.length > 0) {
                artist[category] = { "browseId": null, "results": [] };
                if ("navigationEndpoint" in nav(data[0], NAV.CAROUSEL_TITLE)) {
                    artist[category]["browseId"] = nav(data[0], [...NAV.CAROUSEL_TITLE, ...NAV.NAVIGATION_BROWSE_ID]);
                    artist[category]["params"] = nav(data[0], [...NAV.CAROUSEL_TITLE, ...NAV.NAVIGATION_BROWSE, "params"], true);
                }

                artist[category]["results"] = parse_content_list(data[0].contents, category_parser, category_key);
            }
        }

        return artist;
    }
}
