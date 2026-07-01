import { get_flex_column_item, parse_id_name } from './utils';
import { nav, JsonDict, JsonList } from '../helpers';
import * as NAV from '../navigation';

export class DescriptionElement {
    constructor(public text: string) { }
    toString(): string {
        return this.text;
    }
}

export class Link extends DescriptionElement {
    constructor(text: string, public url: string) {
        super(text);
    }
}

export class Timestamp extends DescriptionElement {
    constructor(text: string, public seconds: number) {
        super(text);
    }
}

export class Description extends Array<DescriptionElement> {
    constructor(elements: DescriptionElement[]) {
        super(...elements);
    }

    get text(): string {
        return this.map(element => element.toString()).join("");
    }

    static from_runs(description_runs: JsonList): Description {
        const elements: DescriptionElement[] = [];
        for (const run of description_runs) {
            const navigationEndpoint = nav(run, ["navigationEndpoint"], true);
            let element: DescriptionElement;

            if (navigationEndpoint) {
                element = new DescriptionElement("");
                if ("urlEndpoint" in navigationEndpoint) {
                    element = new Link(run.text, navigationEndpoint.urlEndpoint.url);
                } else if ("watchEndpoint" in navigationEndpoint) {
                    element = new Timestamp(
                        run.text,
                        nav(navigationEndpoint, ["watchEndpoint", "startTimeSeconds"])
                    );
                }
            } else {
                element = new DescriptionElement(nav(run, ["text"], true));
            }
            // @ts-ignore
            if (element) elements.push(element);
        }
        return new Description(elements);
    }
}

export function parse_base_header(header: JsonDict): JsonDict {
    const strapline = nav(header, ["straplineTextOne"]);
    const author = {
        "name": nav(strapline, NAV.RUN_TEXT, true),
        "id": nav(strapline, ["runs", 0, ...NAV.NAVIGATION_BROWSE_ID], true),
    };

    return {
        "author": author.name ? author : null,
        "title": nav(header, NAV.TITLE_TEXT),
        "thumbnails": nav(header, NAV.THUMBNAILS),
    };
}

export function parse_podcast_header(header: JsonDict): JsonDict {
    const metadata = parse_base_header(header);
    metadata["description"] = nav(header, ["description", ...NAV.DESCRIPTION_SHELF, ...NAV.DESCRIPTION], true);
    metadata["saved"] = nav(header, ["buttons", 1, ...NAV.TOGGLED_BUTTON]);
    return metadata;
}

export function parse_episode_header(header: JsonDict): JsonDict {
    const metadata = parse_base_header(header);
    metadata["date"] = nav(header, NAV.SUBTITLE);
    const progress_renderer = nav(header, ["progress", "musicPlaybackProgressRenderer"]); // NAV.PROGRESS_RENDERER is ["musicPlaybackProgressRenderer"]
    // But I didn't export PROGRESS_RENDERER from navigation.ts because I might have missed checking navigation.py thoroughly for everything?
    // Let me check navigation.ts content.
    // Yes, PROGRESS_RENDERER is likely missing if it was in the file but I missed it.
    // I can manually add it here or use string literal. 
    // python: PROGRESS_RENDERER = ["musicPlaybackProgressRenderer"]

    metadata["duration"] = nav(progress_renderer, ["durationText", "runs", 1, "text"], true);
    metadata["progressPercentage"] = nav(progress_renderer, ["playbackProgressPercentage"]);
    metadata["saved"] = nav(header, ["buttons", 0, ...NAV.TOGGLED_BUTTON], true) || false;

    metadata["playlistId"] = null;
    const menu_buttons = nav(header, ["buttons", -1, "menuRenderer", "items"], true);
    if (menu_buttons) {
        for (const button of menu_buttons) {
            if (nav(button, [NAV.MNIR, ...NAV.ICON_TYPE], true) === "BROADCAST") {
                metadata["playlistId"] = nav(button, [NAV.MNIR, ...NAV.NAVIGATION_BROWSE_ID]);
            }
        }
    }

    return metadata;
}

export function parse_episode(data: JsonDict): JsonDict {
    const thumbnails = nav(data, NAV.THUMBNAILS);
    const date = nav(data, NAV.SUBTITLE, true);
    const duration = nav(data, ["playbackProgress", "musicPlaybackProgressRenderer", "durationText", "runs", 1, "text"], true);
    const title = nav(data, NAV.TITLE_TEXT);
    const description = nav(data, NAV.DESCRIPTION, true);
    const videoId = nav(data, ["onTap", ...NAV.WATCH_VIDEO_ID], true);
    const browseId = nav(data, [...NAV.TITLE, ...NAV.NAVIGATION_BROWSE_ID], true);
    const videoType = nav(data, ["onTap", ...NAV.NAVIGATION_VIDEO_TYPE], true);
    const index = nav(data, ["onTap", "watchEndpoint", "index"], true);

    return {
        "index": index,
        "title": title,
        "description": description,
        "duration": duration,
        "videoId": videoId,
        "browseId": browseId,
        "videoType": videoType,
        "date": date,
        "thumbnails": thumbnails,
    };
}

export function parse_episode_flat(data: JsonDict): JsonDict {
    return {
        "title": nav(get_flex_column_item(data, 0), NAV.TEXT_RUN_TEXT),
        "podcast": parse_id_name(nav(get_flex_column_item(data, 1), NAV.TEXT_RUN)),
        "videoId": nav(data, ["playlistItemData", "videoId"]),
        "browseId": nav(get_flex_column_item(data, 0), [...NAV.TEXT_RUN, ...NAV.NAVIGATION_BROWSE_ID]),
        "playlistId": nav(data, [...NAV.PLAY_BUTTON, "playNavigationEndpoint", ...NAV.WATCH_PLAYLIST_ID]),
        "videoType": nav(data, [...NAV.PLAY_BUTTON, "playNavigationEndpoint", ...NAV.NAVIGATION_VIDEO_TYPE]),
        "date": nav(get_flex_column_item(data, 2), NAV.TEXT_RUN_TEXT),
        "thumbnails": nav(data, NAV.THUMBNAILS),
    };
}

export function parse_podcast(data: JsonDict): JsonDict {
    return {
        "title": nav(data, NAV.TITLE_TEXT),
        "channel": parse_id_name(nav(data, [...NAV.SUBTITLE_RUNS, 0], true)),
        "browseId": nav(data, [...NAV.TITLE, ...NAV.NAVIGATION_BROWSE_ID]),
        "podcastId": nav(data, NAV.THUMBNAIL_OVERLAY, true),
        "thumbnails": nav(data, NAV.THUMBNAIL_RENDERER),
    };
}
