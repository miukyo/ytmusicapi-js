import axios, { AxiosInstance } from 'axios';
import {
    initialize_context,
    initialize_headers,
    get_visitor_id,
    sapisid_from_cookie,
    get_authorization,
    JsonDict,
    JsonList,
    nav,
    sum_total_duration,
    find_objects_by_key,
    parse_description_runs
} from './helpers';
import {
    YTM_BASE_API,
    YTM_PARAMS,
    YTM_PARAMS_KEY,
    SUPPORTED_LANGUAGES,
    SUPPORTED_LOCATIONS
} from './constants';
import { AuthType } from './auth/types';
import { parse_auth_str, determine_auth_type } from './auth/auth_parse';
import { YTMusicUserError, YTMusicServerError } from './exceptions';
import * as NAV from './navigation';
import {
    parse_search_results,
    get_search_params,
    parse_search_suggestions,
    parse_top_result
} from './parsers/search';
import { Parser } from './parsers/i18n';
import { parse_album_header_2024 } from './parsers/albums';
import { parse_playlist_items } from './parsers/playlists';
import {
    parse_content_list,
    parse_playlist,
    parse_video,
    parse_album
} from './parsers/browsing';
import {
    parse_chart_song,
    parse_trending_item,
    parse_chart_playlist,
    parse_chart_episode,
    parse_chart_artist
} from './parsers/explore';
import {
    parse_library_albums,
    parse_library_artists,
    parse_library_podcasts,
    parse_library_songs,
    get_library_contents,
    pop_songs_random_mix
} from './parsers/library';
import {
    parse_podcast_header,
    parse_episode_header,
    parse_episode,
    parse_podcast,
    Description
} from './parsers/podcasts';
import { parse_uploaded_items } from './parsers/uploads';
import {
    parse_watch_playlist,
    get_tab_browse_ids
} from './parsers/watch';
import {
    get_continuation_params,
    get_continuation_contents,
    get_reloadable_continuations,
    get_continuations_2025,
    get_continuations
} from './continuations';

export type LibraryOrderType = "a_to_z" | "z_to_a" | "recently_added";
export type LikeStatus = "LIKE" | "DISLIKE" | "INDIFFERENT";
export type PlaylistSortOrder = "MANUAL" | "RECENT_ACTIVITY" | "TITLE" | "TRACK_COUNT";
export type PlaylistVoteEditOptions = "ALL_COLLABORATORS" | "OWNER_ONLY" | "OFF";

function html_to_txt(html: string): string {
    return html.replace(/<[^>]*>/g, '');
}

function validate_playlist_id(playlistId: string): string {
    return playlistId.startsWith("VL") ? playlistId : "VL" + playlistId;
}

function get_vote_option_argument(option: PlaylistVoteEditOptions): string {
    if (option === "ALL_COLLABORATORS") {
        return "PLAYLIST_ITEM_VOTE_PERMISSION_ALL_COLLABORATORS";
    } else if (option === "OWNER_ONLY") {
        return "PLAYLIST_ITEM_VOTE_PERMISSION_OWNER_ONLY";
    } else if (option === "OFF") {
        return "PLAYLIST_ITEM_VOTE_PERMISSION_DISABLED";
    }
    throw new YTMusicUserError(`Invalid vote option provided: ${option}`);
}

function validate_order_parameter(order: LibraryOrderType | null): void {
    if (order !== null && !["a_to_z", "z_to_a", "recently_added"].includes(order)) {
        throw new YTMusicUserError(`Invalid order provided: ${order}`);
    }
}

function prepare_order_params(order: LibraryOrderType): string {
    if (order === "a_to_z") {
        return "ggMPOg1BR0VOREFfQUxQSEFCRQ%3D%3D";
    } else if (order === "z_to_a") {
        return "ggMPOg1BR0VOREFfUkVWRVJTRQ%3D%3D";
    } else if (order === "recently_added") {
        return "ggMPOg1BR0VOREFfUkVDRU5UTVk%3D";
    }
    return "";
}

function prepare_like_endpoint(rating: LikeStatus): string {
    if (rating === "LIKE") {
        return "like/like";
    } else if (rating === "DISLIKE") {
        return "like/dislike";
    } else if (rating === "INDIFFERENT") {
        return "like/removelike";
    }
    throw new YTMusicUserError(`Invalid rating provided: ${rating}`);
}

export class YTMusic {
    public context: JsonDict;
    public language: string;
    public lang: any;
    public _auth_headers: Record<string, string> = {};
    public auth_type: AuthType = AuthType.UNAUTHORIZED;
    private _session: AxiosInstance;
    private proxies: Record<string, string> | null = null;
    private cookies: Record<string, string> = { "SOCS": "CAI" };
    private sapisid: string = "";
    private origin: string = "";
    private params: string = YTM_PARAMS;
    private _token: any = null;
    public parser: Parser;

    constructor(
        auth: string | JsonDict | null = null,
        user: string | null = null,
        proxies: Record<string, string> | null = null,
        language: string = "en",
        location: string = "",
        oauth_credentials: any | null = null
    ) {
        this._session = axios.create();
        this.proxies = proxies;

        if (auth) {
            const [headers, path] = parse_auth_str(auth);
            this._auth_headers = headers;
            this.auth_type = determine_auth_type(this._auth_headers);

            if (this.auth_type === AuthType.OAUTH_CUSTOM_CLIENT) {
                if (!oauth_credentials) {
                    throw new YTMusicUserError("oauth JSON provided via auth argument, but oauth_credentials not provided.");
                }
                console.warn("OAuth custom client logic not fully implemented yet.");
            }
        }

        this.context = initialize_context();

        if (location) {
            if (!SUPPORTED_LOCATIONS.has(location)) {
                throw new YTMusicUserError("Location not supported.");
            }
            this.context.context.client.gl = location;
        }

        if (!SUPPORTED_LANGUAGES.has(language)) {
            throw new YTMusicUserError("Language not supported.");
        }
        this.context.context.client.hl = language;
        this.language = language;
        this.lang = { gettext: (s: string) => s };
        this.parser = new Parser();

        if (user) {
            this.context.context.user.onBehalfOfUser = user;
        }

        this.params = YTM_PARAMS;
        if (this.auth_type === AuthType.BROWSER) {
            this.params += YTM_PARAMS_KEY;
            const cookie = this._auth_headers["cookie"];
            if (cookie) {
                this.sapisid = sapisid_from_cookie(cookie);
                this.origin = this._auth_headers["origin"] || this._auth_headers["x-origin"] || "";
            } else {
                throw new YTMusicUserError("Your cookie is missing the required value __Secure-3PAPISID");
            }
        }
    }

    private _check_auth(): void {
        if (this.auth_type === AuthType.UNAUTHORIZED) {
            throw new YTMusicUserError("Please provide authentication before using this function");
        }
    }

    private async _prepare_headers(): Promise<Record<string, string>> {
        let headers: Record<string, string> = {};

        if (this.auth_type === AuthType.BROWSER || this.auth_type === AuthType.OAUTH_CUSTOM_FULL) {
            Object.assign(headers, this._auth_headers);
        } else {
            Object.assign(headers, initialize_headers());
        }

        if (!headers["X-Goog-Visitor-Id"]) {
            const visitorId = await get_visitor_id();
            if (visitorId) {
                headers["X-Goog-Visitor-Id"] = visitorId;
            }
        }

        if (this.auth_type === AuthType.BROWSER) {
            headers["authorization"] = get_authorization(this.sapisid + " " + this.origin);
        }

        return headers;
    }

    private async _send_request(endpoint: string, body: JsonDict, additionalParams: string = ""): Promise<JsonDict> {
        Object.assign(body, this.context);
        const headers = await this._prepare_headers();

        const cookieStrings = Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`);
        if (headers["cookie"]) {
            cookieStrings.push(headers["cookie"]);
        }
        headers["Cookie"] = cookieStrings.join("; ");

        try {
            const response = await this._session.post(
                YTM_BASE_API + endpoint + this.params + additionalParams,
                body,
                { headers: headers }
            );

            const response_text = response.data;
            if (response_text.error) {
                const message = response_text.error.message || "Unknown Error";
                throw new YTMusicServerError(message);
            }
            return response_text;

        } catch (error: any) {
            if (error instanceof YTMusicServerError) throw error;

            let message = "Request failed: ";
            if (axios.isAxiosError(error)) {
                message += error.message;
                if (error.response) {
                    message += ` (Status ${error.response.status})`;
                    if (error.response.data && error.response.data.error) {
                        message += `: ${error.response.data.error.message}`;
                    }
                }
                throw new YTMusicServerError(message);
            }
            throw error;
        }
    }

    public async search(
        query: string,
        filter: string | null = null,
        scope: string | null = null,
        limit: number = 20,
        ignore_spelling: boolean = false
    ): Promise<JsonList> {
        const ALL_RESULT_TYPES = ["songs", "videos", "albums", "artists", "playlists", "community_playlists", "featured_playlists", "profiles", "podcasts", "episodes"];
        if (filter && !ALL_RESULT_TYPES.includes(filter)) {
            throw new YTMusicUserError(`Invalid filter provided: ${filter}`);
        }
        const ALL_SCOPES = ["uploads", "library"];
        if (scope && !ALL_SCOPES.includes(scope)) {
            throw new YTMusicUserError(`Invalid scope provided: ${scope}`);
        }

        const body: JsonDict = { "query": query };
        const endpoint = "search";
        const search_params = get_search_params(filter, scope, ignore_spelling);

        if (search_params) {
            body["params"] = search_params;
        }

        if (!scope && !filter) {
            if (ignore_spelling) {
                body["params"] = "EhGKAQ4IARABGAEgASgAOAFAAUICCAE%3D";
            }
        }

        const response = await this._send_request(endpoint, body);
        const search_results: JsonList = [];

        if (!("contents" in response)) return search_results;

        let results;
        if ("tabbedSearchResultsRenderer" in response["contents"]) {
            const scopes = ["library", "uploads"];
            const tab_index = (!scope || filter) ? 0 : scopes.indexOf(scope) + 1;
            results = response["contents"]["tabbedSearchResultsRenderer"]["tabs"][tab_index]["tabRenderer"]["content"];
        } else {
            results = response["contents"];
        }

        const section_list = nav(results, NAV.SECTION_LIST);

        if (section_list.length === 1 && "itemSectionRenderer" in section_list[0]) {
            return search_results;
        }

        // set filter for parser
        let internal_filter: string | null = filter;
        let result_type: string | null = null;
        if (internal_filter && internal_filter.includes("playlists")) {
            internal_filter = "playlists";
        } else if (scope === "uploads") {
            internal_filter = "uploads";
            result_type = "upload";
        }

        for (const res of section_list) {
            let category = null;

            if ("musicCardShelfRenderer" in res) {
                const top_result = parse_top_result(
                    res["musicCardShelfRenderer"],
                    ["song", "video", "album", "artist", "playlist", "community playlist", "featured playlist", "upload", "profile", "podcast", "episode"]
                );
                search_results.push(top_result);

                const shelf_contents = nav(res, ["musicCardShelfRenderer", "contents"], true);
                if (!shelf_contents) continue;

                if ("messageRenderer" in shelf_contents[0]) {
                    category = nav(shelf_contents.shift(), ["messageRenderer", ...NAV.TEXT_RUN_TEXT]);
                }
            } else {
                let shelf_contents;
                if ("musicShelfRenderer" in res) {
                    shelf_contents = res["musicShelfRenderer"]["contents"];
                    category = nav(res, [...NAV.MUSIC_SHELF, ...NAV.TITLE_TEXT], true);
                } else if ("itemSectionRenderer" in res) {
                    shelf_contents = res["itemSectionRenderer"]["contents"];
                    if (!(NAV.MRLIR in shelf_contents[0])) {
                        continue;
                    }
                } else {
                    continue;
                }

                if (internal_filter && scope !== "uploads") {
                    result_type = internal_filter.slice(0, -1).toLowerCase();
                }

                search_results.push(...parse_search_results(shelf_contents, result_type, category));
            }
        }

        return search_results;
    }

    public async get_search_suggestions(query: string, detailed_runs: boolean = false): Promise<string[] | JsonList> {
        const body = { "input": query };
        const endpoint = "music/get_search_suggestions";
        const response = await this._send_request(endpoint, body);
        return parse_search_suggestions(response, detailed_runs);
    }

    public async get_artist(channelId: string): Promise<JsonDict> {
        if (channelId.startsWith("MPLA")) channelId = channelId.substring(4);
        const body = { "browseId": channelId };
        const endpoint = "browse";
        const response = await this._send_request(endpoint, body);

        const results = nav(response, [...NAV.SINGLE_COLUMN_TAB, ...NAV.SECTION_LIST]);

        const artist: JsonDict = { description: null, descriptionRuns: [], views: null };
        const header = response.header.musicImmersiveHeaderRenderer;
        artist["name"] = nav(header, NAV.TITLE_TEXT);

        const descriptionShelf = find_objects_by_key(results, NAV.DESCRIPTION_SHELF[0]).find((item: any) => item[NAV.DESCRIPTION_SHELF[0]]);
        if (descriptionShelf) {
            const shelf = descriptionShelf[NAV.DESCRIPTION_SHELF[0]];
            const [description, description_runs] = parse_description_runs(nav(shelf, NAV.DESCRIPTION_RUN_LIST, true));
            artist["description"] = description;
            artist["descriptionRuns"] = description_runs;
            artist["views"] = "subheader" in shelf ? shelf.subheader.runs[0].text : null;
        }

        const subscription_button = header.subscriptionButton.subscribeButtonRenderer;
        artist["channelId"] = subscription_button.channelId;
        artist["shuffleId"] = nav(header, ["playButton", "buttonRenderer", ...NAV.NAVIGATION_PLAYLIST_ID], true);
        artist["radioId"] = nav(header, ["startRadioButton", "buttonRenderer", ...NAV.NAVIGATION_PLAYLIST_ID], true);
        artist["subscribers"] = nav(subscription_button, ["subscriberCountText", "runs", 0, "text"], true);

        Object.assign(artist, this.parser.parse_channel_contents(results));

        return artist;
    }

    public async get_album(browseId: string): Promise<JsonDict> {
        if (!browseId || !browseId.startsWith("MPRE")) {
            throw new YTMusicUserError("Invalid album browseId provided, must start with MPRE.");
        }
        const body = { "browseId": browseId };
        const endpoint = "browse";
        const response = await this._send_request(endpoint, body);

        const album = parse_album_header_2024(response);
        const results = nav(response, [...NAV.TWO_COLUMN_RENDERER, "secondaryContents", ...NAV.SECTION_LIST_ITEM, ...NAV.MUSIC_SHELF]);

        album["tracks"] = parse_playlist_items(results.contents, true);
        album["duration_seconds"] = sum_total_duration(album);

        for (const track of album["tracks"]) {
            track["album"] = album["title"];
            track["artists"] = track["artists"] || album["artists"];
        }

        return album;
    }

    public async get_playlist(
        playlistId: string,
        limit: number | null = 100,
        related: boolean = false,
        suggestions_limit: number = 0
    ): Promise<JsonDict> {
        const browseId = playlistId.startsWith("VL") ? playlistId : "VL" + playlistId;
        const body = { "browseId": browseId };
        const endpoint = "browse";
        const request_func = (additionalParams: string) => this._send_request(endpoint, body, additionalParams);
        const response = await request_func("");

        const request_func_continuations = (body: JsonDict) => this._send_request(endpoint, body);
        const is_ola = playlistId.startsWith("OLA") || playlistId.startsWith("VLOLA");
        const has_playlist_header = nav(response, [...NAV.TWO_COLUMN_RENDERER, ...NAV.TAB_CONTENT, ...NAV.SECTION_LIST_ITEM], true);
        if (is_ola && !has_playlist_header) {
            // Note: parse_audio_playlist is not fully implemented in JS, we fallback to parse_playlist
            // but we can parse it from response.
        }

        const header_data = nav(response, [...NAV.TWO_COLUMN_RENDERER, ...NAV.TAB_CONTENT, ...NAV.SECTION_LIST_ITEM]);
        const section_list = nav(response, [...NAV.TWO_COLUMN_RENDERER, "secondaryContents", ...NAV.SECTION]);
        const playlist: JsonDict = {};
        playlist["owned"] = NAV.EDITABLE_PLAYLIST_DETAIL_HEADER[0] in header_data;
        
        let header;
        if (!playlist["owned"]) {
            header = nav(header_data, NAV.RESPONSIVE_HEADER);
            playlist["id"] = nav(
                header,
                ["buttons", 1, "musicPlayButtonRenderer", "playNavigationEndpoint", ...NAV.WATCH_PLAYLIST_ID],
                true
            );
            playlist["privacy"] = "PUBLIC";
        } else {
            playlist["id"] = nav(header_data, [...NAV.EDITABLE_PLAYLIST_DETAIL_HEADER, ...NAV.PLAYLIST_ID]);
            header = nav(header_data, [...NAV.EDITABLE_PLAYLIST_DETAIL_HEADER, ...NAV.HEADER, ...NAV.RESPONSIVE_HEADER]);
            playlist["privacy"] = header_data[NAV.EDITABLE_PLAYLIST_DETAIL_HEADER[0]]["editHeader"]["musicPlaylistEditHeaderRenderer"]["privacy"];
        }

        const description_shelf = nav(header, ["description", ...NAV.DESCRIPTION_SHELF], true);
        playlist["description"] = description_shelf ? description_shelf.description.runs.map((r: any) => r.text).join("") : null;

        const description_runs = nav(header, ["description", ...NAV.DESCRIPTION_RUN_LIST], true);
        if (description_runs) {
            const [desc, desc_runs] = parse_description_runs(description_runs);
            playlist["description"] = desc;
            playlist["descriptionRuns"] = desc_runs;
        }

        playlist["title"] = nav(header, NAV.TITLE_TEXT);
        playlist["thumbnails"] = nav(header, NAV.THUMBNAILS, true);

        // Subtitle details
        const subtitle_runs = nav(header, NAV.SUBTITLE_RUNS, true);
        if (subtitle_runs) {
            // parse playlist header metadata (author, year, count)
            const author_run = subtitle_runs[0];
            playlist["author"] = {
                "name": author_run.text,
                "id": nav(author_run, NAV.NAVIGATION_BROWSE_ID, true)
            };
            // check collaborators
            if (author_run.text && author_run.text.includes("collaborators")) {
                playlist["collaborators"] = {
                    "text": author_run.text,
                    "avatars": []
                };
            }
        }

        playlist["related"] = [];
        if ("continuations" in section_list) {
            let additionalParams = get_continuation_params(section_list);
            if (playlist["owned"] && (suggestions_limit > 0 || related)) {
                const parse_func = (results: JsonList) => parse_playlist_items(results);
                const suggested = await request_func(additionalParams);
                const continuation = nav(suggested, NAV.SECTION_LIST_CONTINUATION);
                additionalParams = get_continuation_params(continuation);
                const suggestions_shelf = nav(continuation, [...NAV.CONTENT, "musicShelfRenderer"]);
                playlist["suggestions"] = get_continuation_contents(suggestions_shelf, parse_func);

                playlist["suggestions"].push(...(await get_reloadable_continuations(
                    suggestions_shelf,
                    "musicShelfContinuation",
                    suggestions_limit - playlist["suggestions"].length,
                    request_func,
                    parse_func
                )));
            }

            if (related) {
                const response_related = await request_func(additionalParams);
                const continuation = nav(response_related, NAV.SECTION_LIST_CONTINUATION, true);
                if (continuation) {
                    const parse_func = (results: JsonList) => parse_content_list(results, parse_playlist);
                    playlist["related"] = get_continuation_contents(
                        nav(continuation, [...NAV.CONTENT, "musicCarouselShelfRenderer"]),
                        parse_func
                    );
                }
            }
        }

        playlist["tracks"] = [];
        const content_data = nav(section_list, [...NAV.CONTENT, "musicPlaylistShelfRenderer"]);
        if (content_data && "contents" in content_data) {
            const is_collaborative = "collaborators" in playlist;
            playlist["tracks"] = parse_playlist_items(content_data.contents, is_collaborative);

            const parse_func = (contents: JsonList) => parse_playlist_items(contents, is_collaborative);
            playlist["tracks"].push(...(await get_continuations_2025(content_data, limit, request_func_continuations, parse_func)));
        }

        playlist["duration_seconds"] = sum_total_duration(playlist);
        return playlist;
    }

    public async get_liked_songs(limit: number = 100): Promise<JsonDict> {
        this._check_auth();
        return this.get_playlist("LM", limit);
    }

    public async get_saved_episodes(limit: number = 100): Promise<JsonDict> {
        this._check_auth();
        return this.get_playlist("SE", limit);
    }

    public async create_playlist(
        title: string,
        description: string,
        privacy_status: string = "PRIVATE",
        video_ids: string[] | null = null,
        source_playlist: string | null = null
    ): Promise<string | JsonDict> {
        this._check_auth();
        const invalid_characters = ["<", ">"];
        const invalid_found = invalid_characters.filter(c => title.includes(c));
        if (invalid_found.length > 0) {
            throw new YTMusicUserError(`${title} contains invalid characters: ${invalid_found.join(", ")}`);
        }

        const body: JsonDict = {
            "title": title,
            "description": html_to_txt(description),
            "privacyStatus": privacy_status
        };
        if (video_ids !== null) {
            body["videoIds"] = video_ids;
        }
        if (source_playlist !== null) {
            body["sourcePlaylistId"] = source_playlist;
        }

        const endpoint = "playlist/create";
        const response = await this._send_request(endpoint, body);
        return response["playlistId"] || response;
    }

    public async join_collaborative_playlist(playlistId: string, joinCollaborationToken: string): Promise<string | JsonDict> {
        this._check_auth();
        const body: JsonDict = {
            "playlistId": validate_playlist_id(playlistId),
            "actions": [
                { "action": "ACTION_JOIN_COLLABORATION", "joinCollaborationToken": joinCollaborationToken }
            ]
        };
        const endpoint = "browse/edit_playlist";
        const response = await this._send_request(endpoint, body);
        return response["status"] || response;
    }

    public async edit_playlist(
        playlistId: string,
        options: {
            title?: string;
            description?: string;
            privacyStatus?: string;
            collaboration?: boolean;
            moveItem?: string | [string, string];
            addPlaylistId?: string;
            sortOrder?: PlaylistSortOrder;
            addToTop?: boolean;
            voteOption?: PlaylistVoteEditOptions;
        } = {}
    ): Promise<string | JsonDict> {
        this._check_auth();
        const body: JsonDict = { "playlistId": validate_playlist_id(playlistId) };
        const actions: JsonList = [];

        if (options.title) {
            actions.push({ "action": "ACTION_SET_PLAYLIST_NAME", "playlistName": options.title });
        }
        if (options.description) {
            actions.push({ "action": "ACTION_SET_PLAYLIST_DESCRIPTION", "playlistDescription": options.description });
        }
        if (options.privacyStatus) {
            actions.push({ "action": "ACTION_SET_PLAYLIST_PRIVACY", "playlistPrivacy": options.privacyStatus });
        }
        if (options.collaboration !== undefined) {
            if (options.collaboration) {
                actions.push({ "action": "ACTION_CREATE_COLLABORATION_INVITE_LINK" });
            } else {
                actions.push({ "action": "ACTION_SET_CLOSED_TO_CONTRIBUTIONS", "closedToContributions": true });
            }
        }
        if (options.moveItem) {
            const action: JsonDict = {
                "action": "ACTION_MOVE_VIDEO_BEFORE",
                "setVideoId": typeof options.moveItem === "string" ? options.moveItem : options.moveItem[0]
            };
            if (Array.isArray(options.moveItem) && options.moveItem.length > 1) {
                action["movedSetVideoIdSuccessor"] = options.moveItem[1];
            }
            actions.push(action);
        }
        if (options.addPlaylistId) {
            actions.push({ "action": "ACTION_ADD_PLAYLIST", "addedFullListId": options.addPlaylistId });
        }
        if (options.sortOrder) {
            actions.push({ "action": "ACTION_SET_PLAYLIST_VIDEO_ORDER", "playlistVideoOrder": options.sortOrder });
        }
        if (options.addToTop !== undefined) {
            actions.push({ "action": "ACTION_SET_ADD_TO_TOP", "addToTop": String(options.addToTop) });
        }
        if (options.voteOption !== undefined) {
            actions.push({
                "action": "ACTION_SET_ALLOW_ITEM_VOTE",
                "itemVotePermission": get_vote_option_argument(options.voteOption)
            });
        }

        body["actions"] = actions;
        const endpoint = "browse/edit_playlist";
        const response = await this._send_request(endpoint, body);

        if (options.collaboration && response["status"] === "STATUS_SUCCEEDED") {
            const invite_link = nav(response, ["collaborationInviteLink"]);
            const url_obj = new URL(invite_link);
            return {
                "status": response["status"],
                "joinCollaborationToken": url_obj.searchParams.get("jct")
            };
        }

        return response["status"] || response;
    }

    public async delete_playlist(playlistId: string): Promise<string | JsonDict> {
        this._check_auth();
        const body = { "playlistId": validate_playlist_id(playlistId) };
        const endpoint = "playlist/delete";
        const response = await this._send_request(endpoint, body);
        return response["status"] || response;
    }

    public async add_playlist_items(
        playlistId: string,
        videoIds: string[] | null = null,
        source_playlist: string | null = null,
        duplicates: boolean = false
    ): Promise<any> {
        this._check_auth();
        const body: JsonDict = { "playlistId": validate_playlist_id(playlistId), "actions": [] };
        if (!videoIds && !source_playlist) {
            throw new YTMusicUserError("You must provide either videoIds or a source_playlist to add to the playlist");
        }

        if (videoIds) {
            for (const videoId of videoIds) {
                const action: JsonDict = { "action": "ACTION_ADD_VIDEO", "addedVideoId": videoId };
                if (duplicates) {
                    action["dedupeOption"] = "DEDUPE_OPTION_SKIP";
                }
                body["actions"].push(action);
            }
        }

        if (source_playlist) {
            body["actions"].push({ "action": "ACTION_ADD_PLAYLIST", "addedFullListId": source_playlist });
            if (!videoIds) {
                body["actions"].push({ "action": "ACTION_ADD_VIDEO", "addedVideoId": null });
            }
        }

        const endpoint = "browse/edit_playlist";
        const response = await this._send_request(endpoint, body);
        if (response["status"] && response["status"].includes("SUCCEEDED")) {
            const result_dict = (response["playlistEditResults"] || []).map((r: any) => r.playlistEditVideoAddedResultData);
            return { "status": response["status"], "playlistEditResults": result_dict };
        } else {
            return response;
        }
    }

    public async remove_playlist_items(playlistId: string, videos: JsonList): Promise<string | JsonDict> {
        this._check_auth();
        const filtered_videos = videos.filter(v => "videoId" in v && "setVideoId" in v);
        if (filtered_videos.length === 0) {
            throw new YTMusicUserError("Cannot remove songs, because setVideoId is missing. Do you own this playlist?");
        }

        const body: JsonDict = { "playlistId": validate_playlist_id(playlistId), "actions": [] };
        for (const video of filtered_videos) {
            body["actions"].push({
                "setVideoId": video["setVideoId"],
                "removedVideoId": video["videoId"],
                "action": "ACTION_REMOVE_VIDEO"
            });
        }

        const endpoint = "browse/edit_playlist";
        const response = await this._send_request(endpoint, body);
        return response["status"] || response;
    }

    public async get_song(videoId: string): Promise<JsonDict> {
        const endpoint = "player";
        const body = {
            "playbackContext": { "contentPlaybackContext": { "signatureTimestamp": Math.floor(Date.now() / 1000) - 1 } },
            "video_id": videoId
        };
        const response = await this._send_request(endpoint, body);
        return response;
    }

    public async get_song_credits(browseId: string): Promise<JsonDict> {
        if (!browseId || !browseId.startsWith("MPTC")) {
            throw new YTMusicUserError("Invalid song credits browseId provided, must start with MPTC.");
        }

        const body = { "browseId": browseId };
        const endpoint = "browse";
        const response = await this._send_request(endpoint, body);

        const credits: JsonDict = { "other_sections": [] };
        const sections = nav(response, NAV.CREDITS_SECTIONS);
        const localized_section_map = this.parser.get_song_credit_section_map();

        for (const section of sections) {
            const section_content = section.dismissableDialogContentSectionRenderer;

            const section_local_name = nav(section_content, NAV.TITLE_TEXT) as string;
            const section_snake_case_name = localized_section_map[section_local_name];

            const runs = nav(section_content, NAV.SUBTITLE_RUNS) || [];
            const data: string[] = [];
            for (let i = 0; i < runs.length; i += 2) {
                data.push(runs[i].text);
            }

            const section_data = {
                "localized_title": section_local_name,
                "data": data,
            };

            if (section_snake_case_name !== undefined) {
                credits[section_snake_case_name] = section_data;
            } else {
                credits.other_sections.push(section_data);
            }
        }

        return credits;
    }

    public async get_mood_categories(): Promise<JsonDict> {
        const sections: JsonDict = {};
        const response = await this._send_request("browse", { "browseId": "FEmusic_moods_and_genres" });
        const results = nav(response, [...NAV.SINGLE_COLUMN_TAB, ...NAV.SECTION_LIST]);
        for (const section of results) {
            const title = nav(section, [...NAV.GRID, "header", "gridHeaderRenderer", ...NAV.TITLE_TEXT]);
            sections[title] = [];
            const gridItems = nav(section, NAV.GRID_ITEMS);
            for (const category of gridItems) {
                sections[title].push({
                    "title": nav(category, NAV.CATEGORY_TITLE),
                    "params": nav(category, NAV.CATEGORY_PARAMS)
                });
            }
        }
        return sections;
    }

    public async get_mood_playlists(params: string): Promise<JsonList> {
        let playlists: JsonList = [];
        const response = await this._send_request(
            "browse",
            { "browseId": "FEmusic_moods_and_genres_category", "params": params }
        );
        const results = nav(response, [...NAV.SINGLE_COLUMN_TAB, ...NAV.SECTION_LIST]);
        for (const section of results) {
            let path: any[] = [];
            if ("gridRenderer" in section) {
                path = NAV.GRID_ITEMS;
            } else if ("musicCarouselShelfRenderer" in section) {
                path = NAV.CAROUSEL_CONTENTS;
            } else if ("musicImmersiveCarouselShelfRenderer" in section) {
                path = ["musicImmersiveCarouselShelfRenderer", "contents"];
            }
            if (path.length > 0) {
                const items = nav(section, path);
                playlists.push(...parse_content_list(items, parse_playlist));
            }
        }
        return playlists;
    }

    public async get_explore(): Promise<JsonDict> {
        const body = { "browseId": "FEmusic_explore" };
        const response = await this._send_request("browse", body);
        const results = nav(response, [...NAV.SINGLE_COLUMN_TAB, ...NAV.SECTION_LIST]);
        const explore: JsonDict = {};

        for (const result of results) {
            const browse_id = nav(result, [...NAV.CAROUSEL, ...NAV.CAROUSEL_TITLE, ...NAV.NAVIGATION_BROWSE_ID], true);
            if (!browse_id) continue;

            const contents = nav(result, NAV.CAROUSEL_CONTENTS, true);
            if (!contents) continue;

            if (browse_id === "FEmusic_new_releases_albums") {
                explore["new_releases"] = parse_content_list(contents, parse_album);
            } else if (browse_id === "FEmusic_moods_and_genres") {
                explore["moods_and_genres"] = contents.map((genre: any) => ({
                    "title": nav(genre, NAV.CATEGORY_TITLE),
                    "params": nav(genre, NAV.CATEGORY_PARAMS)
                }));
            } else if (browse_id === "FEmusic_top_non_music_audio_episodes") {
                explore["top_episodes"] = parse_content_list(contents, parse_chart_episode, NAV.MMRIR);
            } else if (browse_id === "FEmusic_new_releases_videos") {
                explore["new_videos"] = parse_content_list(contents, parse_video, NAV.MTRIR);
            } else if (browse_id.startsWith("VLPL")) {
                explore["top_songs"] = {
                    "playlist": browse_id,
                    "items": parse_content_list(contents, parse_chart_song, NAV.MRLIR),
                };
            } else if (browse_id.startsWith("VLOLA")) {
                explore["trending"] = {
                    "playlist": browse_id,
                    "items": parse_content_list(contents, parse_trending_item, NAV.MRLIR),
                };
            }
        }
        return explore;
    }

    public async get_charts(country: string = "ZZ"): Promise<JsonDict> {
        const body: JsonDict = { "browseId": "FEmusic_charts" };
        if (country) {
            body["formData"] = { "selectedValues": [country] };
        }
        const response = await this._send_request("browse", body);
        const results = nav(response, [...NAV.SINGLE_COLUMN_TAB, ...NAV.SECTION_LIST]);
        const charts: JsonDict = { "countries": {} };

        const menu = nav(
            results[0],
            [
                ...NAV.MUSIC_SHELF,
                "subheaders",
                0,
                "musicSideAlignedItemRenderer",
                "startItems",
                0,
                "musicSortFilterButtonRenderer",
            ]
        );
        charts["countries"]["selected"] = nav(menu, NAV.TITLE);
        
        const mutations = nav(response, NAV.FRAMEWORK_MUTATIONS, true) || [];
        charts["countries"]["options"] = mutations
            .map((m: any) => nav(m, ["payload", "musicFormBooleanChoice", "opaqueToken"], true))
            .filter(Boolean);

        let charts_categories: [string, any, string][] = [
            ["videos", parse_chart_playlist, NAV.MTRIR],
        ];
        if (country === "US") {
            charts_categories.push(["genres", parse_chart_playlist, NAV.MTRIR]);
        }
        charts_categories.push(["artists", parse_chart_artist, NAV.MRLIR]);

        if ((results.length - 1) > charts_categories.length) {
            charts_categories = [
                ["daily", parse_chart_playlist, NAV.MTRIR],
                ["weekly", parse_chart_playlist, NAV.MTRIR],
                ...charts_categories.slice(1)
            ];
        }

        for (let i = 0; i < charts_categories.length; i++) {
            const [name, parse_func, key] = charts_categories[i];
            const carousel = nav(results[1 + i], NAV.CAROUSEL_CONTENTS, true);
            if (carousel) {
                charts[name] = parse_content_list(carousel, parse_func, key);
            }
        }

        return charts;
    }

    private async _send_get_request(url: string, params: JsonDict): Promise<any> {
        const response = await this._session.get(url, { params });
        return response;
    }

    public async get_library_playlists(limit: number | null = 25): Promise<JsonList> {
        this._check_auth();
        const body = { "browseId": "FEmusic_liked_playlists" };
        const endpoint = "browse";
        const response = await this._send_request(endpoint, body);

        const results = get_library_contents(response, NAV.GRID);
        if (!results) return [];
        const playlists = parse_content_list(results["items"].slice(1), parse_playlist);

        if ("continuations" in results) {
            const request_func = (additionalParams: string) => this._send_request(endpoint, body, additionalParams);
            const parse_func = (contents: JsonList) => parse_content_list(contents, parse_playlist);
            const remaining_limit = limit === null ? null : (limit - playlists.length);
            playlists.push(...(await get_continuations(results, "gridContinuation", remaining_limit, request_func, parse_func)));
        }

        return playlists;
    }

    public async get_library_songs(
        limit: number | null = 25,
        validate_responses: boolean = false,
        order: LibraryOrderType | null = null
    ): Promise<JsonList> {
        this._check_auth();
        const body: JsonDict = { "browseId": "FEmusic_liked_videos" };
        validate_order_parameter(order);
        if (order !== null) {
            body["params"] = prepare_order_params(order);
        }
        const endpoint = "browse";

        const request_func = () => this._send_request(endpoint, body);
        const parse_func = (raw_response: JsonDict) => parse_library_songs(raw_response);

        if (validate_responses && limit === null) {
            throw new YTMusicUserError("Validation is not supported without a limit parameter.");
        }

        const response = parse_func(await request_func());
        const results = response["results"];
        const songs = response["parsed"];
        if (!songs) return [];

        if ("continuations" in results) {
            const request_continuations_func = (additionalParams: string) => this._send_request(endpoint, body, additionalParams);
            const parse_continuations_func = (contents: JsonList) => parse_playlist_items(contents);

            const remaining_limit = limit === null ? null : (limit - songs.length);
            songs.push(...(await get_continuations(
                results,
                "musicShelfContinuation",
                remaining_limit,
                request_continuations_func,
                parse_continuations_func
            )));
        }

        return songs;
    }

    public async get_library_albums(limit: number | null = 25, order: LibraryOrderType | null = null): Promise<JsonList> {
        this._check_auth();
        const body: JsonDict = { "browseId": "FEmusic_liked_albums" };
        validate_order_parameter(order);
        if (order !== null) {
            body["params"] = prepare_order_params(order);
        }
        const endpoint = "browse";
        const response = await this._send_request(endpoint, body);
        return parse_library_albums(
            response,
            (additionalParams: string) => this._send_request(endpoint, body, additionalParams),
            limit
        );
    }

    public async get_library_artists(limit: number | null = 25, order: LibraryOrderType | null = null): Promise<JsonList> {
        this._check_auth();
        const body: JsonDict = { "browseId": "FEmusic_library_corpus_track_artists" };
        validate_order_parameter(order);
        if (order !== null) {
            body["params"] = prepare_order_params(order);
        }
        const endpoint = "browse";
        const response = await this._send_request(endpoint, body);
        return parse_library_artists(
            response,
            (additionalParams: string) => this._send_request(endpoint, body, additionalParams),
            limit
        );
    }

    public async get_library_subscriptions(limit: number | null = 25, order: LibraryOrderType | null = null): Promise<JsonList> {
        this._check_auth();
        const body: JsonDict = { "browseId": "FEmusic_library_corpus_artists" };
        validate_order_parameter(order);
        if (order !== null) {
            body["params"] = prepare_order_params(order);
        }
        const endpoint = "browse";
        const response = await this._send_request(endpoint, body);
        return parse_library_artists(
            response,
            (additionalParams: string) => this._send_request(endpoint, body, additionalParams),
            limit
        );
    }

    public async get_library_podcasts(limit: number | null = 25, order: LibraryOrderType | null = null): Promise<JsonList> {
        this._check_auth();
        const body: JsonDict = { "browseId": "FEmusic_library_non_music_audio_list" };
        validate_order_parameter(order);
        if (order !== null) {
            body["params"] = prepare_order_params(order);
        }
        const endpoint = "browse";
        const response = await this._send_request(endpoint, body);
        return parse_library_podcasts(
            response,
            (additionalParams: string) => this._send_request(endpoint, body, additionalParams),
            limit
        );
    }

    public async get_library_channels(limit: number | null = 25, order: LibraryOrderType | null = null): Promise<JsonList> {
        this._check_auth();
        const body: JsonDict = { "browseId": "FEmusic_library_non_music_audio_channels_list" };
        validate_order_parameter(order);
        if (order !== null) {
            body["params"] = prepare_order_params(order);
        }
        const endpoint = "browse";
        const response = await this._send_request(endpoint, body);
        return parse_library_artists(
            response,
            (additionalParams: string) => this._send_request(endpoint, body, additionalParams),
            limit
        );
    }

    public async get_history(): Promise<JsonList> {
        this._check_auth();
        const body = { "browseId": "FEmusic_history" };
        const endpoint = "browse";
        const response = await this._send_request(endpoint, body);
        const results = nav(response, [...NAV.SINGLE_COLUMN_TAB, ...NAV.SECTION_LIST]);
        const songs: JsonList = [];

        for (const content of results) {
            const data = nav(content, [...NAV.MUSIC_SHELF, "contents"], true);
            if (!data) {
                const error = nav(content, ["musicNotifierShelfRenderer", ...NAV.TITLE], true);
                throw new YTMusicServerError(error);
            }
            const songlist = parse_playlist_items(data);
            for (const song of songlist) {
                song["played"] = nav(content["musicShelfRenderer"], NAV.TITLE_TEXT);
            }
            songs.push(...songlist);
        }
        return songs;
    }

    public async add_history_item(song: JsonDict): Promise<any> {
        this._check_auth();
        const url = song["playbackTracking"]["videostatsPlaybackUrl"]["baseUrl"];
        const CPNA = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";
        let cpn = "";
        for (let i = 0; i < 16; i++) {
            cpn += CPNA[Math.floor(Math.random() * 256) & 63];
        }
        const params = { "ver": 2, "c": "WEB_REMIX", "cpn": cpn };
        return this._send_get_request(url, params);
    }

    public async remove_history_items(feedbackTokens: string[]): Promise<JsonDict> {
        this._check_auth();
        const body = { "feedbackTokens": feedbackTokens };
        const endpoint = "feedback";
        return this._send_request(endpoint, body);
    }

    public async rate_song(videoId: string, rating: LikeStatus = "INDIFFERENT"): Promise<JsonDict | null> {
        this._check_auth();
        const body = { "target": { "videoId": videoId } };
        const endpoint = prepare_like_endpoint(rating);
        return this._send_request(endpoint, body);
    }

    public async edit_song_library_status(feedbackTokens: string[] | null = null): Promise<JsonDict> {
        this._check_auth();
        const body = { "feedbackTokens": feedbackTokens };
        const endpoint = "feedback";
        return this._send_request(endpoint, body);
    }

    public async rate_playlist(playlistId: string, rating: LikeStatus = "INDIFFERENT"): Promise<JsonDict> {
        this._check_auth();
        const body = { "target": { "playlistId": playlistId } };
        const endpoint = prepare_like_endpoint(rating);
        return this._send_request(endpoint, body);
    }

    public async subscribe_artists(channelIds: string[]): Promise<JsonDict> {
        this._check_auth();
        const body = { "channelIds": channelIds };
        const endpoint = "subscription/subscribe";
        return this._send_request(endpoint, body);
    }

    public async unsubscribe_artists(channelIds: string[]): Promise<JsonDict> {
        this._check_auth();
        const body = { "channelIds": channelIds };
        const endpoint = "subscription/unsubscribe";
        return this._send_request(endpoint, body);
    }

    public async get_account_info(): Promise<JsonDict> {
        this._check_auth();
        const endpoint = "account/account_menu";
        const response = await this._send_request(endpoint, {});

        const ACCOUNT_INFO = [
            "actions",
            0,
            "openPopupAction",
            "popup",
            "multiPageMenuRenderer",
            "header",
            "activeAccountHeaderRenderer",
        ];
        const ACCOUNT_RUNS_TEXT = ["runs", 0, "text"];
        const ACCOUNT_NAME = [...ACCOUNT_INFO, "accountName", ...ACCOUNT_RUNS_TEXT];
        const ACCOUNT_CHANNEL_HANDLE = [...ACCOUNT_INFO, "channelHandle", ...ACCOUNT_RUNS_TEXT];
        const ACCOUNT_PHOTO_URL = [...ACCOUNT_INFO, "accountPhoto", "thumbnails", 0, "url"];

        const account_name = nav(response, ACCOUNT_NAME);
        const channel_handle = nav(response, ACCOUNT_CHANNEL_HANDLE, true);
        const account_photo_url = nav(response, ACCOUNT_PHOTO_URL);

        return {
            "accountName": account_name,
            "channelHandle": channel_handle,
            "accountPhotoUrl": account_photo_url,
        };
    }

    public async get_channel(channelId: string): Promise<JsonDict> {
        const body = { "browseId": channelId };
        const endpoint = "browse";
        const response = await this._send_request(endpoint, body);

        const channel = {
            "title": nav(response, [...NAV.HEADER_MUSIC_VISUAL, ...NAV.TITLE_TEXT]),
            "thumbnails": nav(response, [...NAV.HEADER_MUSIC_VISUAL, ...NAV.THUMBNAILS]),
        };

        const results = nav(response, [...NAV.SINGLE_COLUMN_TAB, ...NAV.SECTION_LIST]);
        Object.assign(channel, this.parser.parse_channel_contents(results));

        return channel;
    }

    public async get_channel_episodes(channelId: string, params: string): Promise<JsonList> {
        const body = { "browseId": channelId, "params": params };
        const endpoint = "browse";
        const response = await this._send_request(endpoint, body);
        const results = nav(response, [...NAV.SINGLE_COLUMN_TAB, ...NAV.SECTION_LIST_ITEM, ...NAV.GRID_ITEMS], true);
        if (!results) return [];
        return parse_content_list(results, parse_episode, NAV.MMRIR);
    }

    public async get_podcast(playlistId: string, limit: number | null = 100): Promise<JsonDict> {
        const browseId = playlistId.startsWith("MPSP") ? playlistId : "MPSP" + playlistId;
        const body = { "browseId": browseId };
        const endpoint = "browse";
        const response = await this._send_request(endpoint, body);
        const two_columns = nav(response, NAV.TWO_COLUMN_RENDERER);
        const header = nav(two_columns, [...NAV.TAB_CONTENT, ...NAV.SECTION_LIST_ITEM, ...NAV.RESPONSIVE_HEADER]);
        const podcast = parse_podcast_header(header);

        const results = nav(two_columns, ["secondaryContents", ...NAV.SECTION_LIST_ITEM, ...NAV.MUSIC_SHELF]);
        const parse_func = (contents: JsonList) => parse_content_list(contents, parse_episode, NAV.MMRIR);
        const episodes = parse_func(results["contents"]);

        if ("continuations" in results) {
            const request_func = (additionalParams: string) => this._send_request(endpoint, body, additionalParams);
            const remaining_limit = limit === null ? null : (limit - episodes.length);
            episodes.push(...(await get_continuations(
                results, "musicShelfContinuation", remaining_limit, request_func, parse_func
            )));
        }

        podcast["episodes"] = episodes;
        return podcast;
    }

    public async get_episode(videoId: string): Promise<JsonDict> {
        const browseId = videoId.startsWith("MPED") ? videoId : "MPED" + videoId;
        const body = { "browseId": browseId };
        const endpoint = "browse";
        const response = await this._send_request(endpoint, body);

        const two_columns = nav(response, NAV.TWO_COLUMN_RENDERER);
        const header = nav(two_columns, [...NAV.TAB_CONTENT, ...NAV.SECTION_LIST_ITEM, ...NAV.RESPONSIVE_HEADER]);
        const episode = parse_episode_header(header);

        episode["description"] = null;
        const description_runs = nav(
            two_columns,
            ["secondaryContents", ...NAV.SECTION_LIST_ITEM, ...NAV.DESCRIPTION_SHELF, "description", "runs"],
            true
        );
        if (description_runs) {
            episode["description"] = Description.from_runs(description_runs);
        }

        return episode;
    }

    public async get_episodes_playlist(playlist_id: string = "RDPN"): Promise<JsonDict> {
        const browseId = playlist_id.startsWith("VL") ? playlist_id : "VL" + playlist_id;
        const body = { "browseId": browseId };
        const endpoint = "browse";
        const response = await this._send_request(endpoint, body);
        const playlist = parse_podcast_header(response);

        const results = nav(response, [...NAV.TWO_COLUMN_RENDERER, "secondaryContents", ...NAV.SECTION_LIST_ITEM, ...NAV.MUSIC_SHELF]);
        const parse_func = (contents: JsonList) => parse_content_list(contents, parse_episode, NAV.MMRIR);
        playlist["episodes"] = parse_func(results["contents"]);

        return playlist;
    }

    public async get_library_upload_songs(limit: number | null = 25, order: LibraryOrderType | null = null): Promise<JsonList> {
        this._check_auth();
        const endpoint = "browse";
        const body: JsonDict = { "browseId": "FEmusic_library_privately_owned_tracks" };
        validate_order_parameter(order);
        if (order !== null) {
            body["params"] = prepare_order_params(order);
        }
        const response = await this._send_request(endpoint, body);
        const results = get_library_contents(response, NAV.MUSIC_SHELF);
        if (!results) return [];
        pop_songs_random_mix(results);
        const songs = parse_uploaded_items(results["contents"]);

        if ("continuations" in results) {
            const request_func = (additionalParams: string) => this._send_request(endpoint, body, additionalParams);
            const remaining_limit = limit === null ? null : (limit - songs.length);
            songs.push(...(await get_continuations(
                results, "musicShelfContinuation", remaining_limit, request_func, parse_uploaded_items
            )));
        }

        return songs;
    }

    public async get_library_upload_albums(limit: number | null = 25, order: LibraryOrderType | null = null): Promise<JsonList> {
        this._check_auth();
        const body: JsonDict = { "browseId": "FEmusic_library_privately_owned_releases" };
        validate_order_parameter(order);
        if (order !== null) {
            body["params"] = prepare_order_params(order);
        }
        const endpoint = "browse";
        const response = await this._send_request(endpoint, body);
        return parse_library_albums(
            response,
            (additionalParams: string) => this._send_request(endpoint, body, additionalParams),
            limit
        );
    }

    public async get_library_upload_artists(limit: number | null = 25, order: LibraryOrderType | null = null): Promise<JsonList> {
        this._check_auth();
        const body: JsonDict = { "browseId": "FEmusic_library_privately_owned_artists" };
        validate_order_parameter(order);
        if (order !== null) {
            body["params"] = prepare_order_params(order);
        }
        const endpoint = "browse";
        const response = await this._send_request(endpoint, body);
        return parse_library_artists(
            response,
            (additionalParams: string) => this._send_request(endpoint, body, additionalParams),
            limit
        );
    }

    public async get_library_upload_artist(browseId: string, limit: number = 25): Promise<JsonList> {
        this._check_auth();
        const body = { "browseId": browseId };
        const endpoint = "browse";
        const response = await this._send_request(endpoint, body);
        const results = nav(response, [...NAV.SINGLE_COLUMN_TAB, ...NAV.SECTION_LIST_ITEM, ...NAV.MUSIC_SHELF]);
        if (results["contents"] && results["contents"].length > 1) {
            results["contents"].shift();
        }

        const items = parse_uploaded_items(results["contents"]);

        if ("continuations" in results) {
            const request_func = (additionalParams: string) => this._send_request(endpoint, body, additionalParams);
            const parse_func = (contents: JsonList) => parse_uploaded_items(contents);
            const remaining_limit = limit === null ? null : (limit - items.length);
            items.push(...(await get_continuations(
                results, "musicShelfContinuation", remaining_limit, request_func, parse_func
            )));
        }

        return items;
    }

    public async get_library_upload_album(browseId: string): Promise<JsonDict> {
        this._check_auth();
        const body = { "browseId": browseId };
        const endpoint = "browse";
        const response = await this._send_request(endpoint, body);
        
        // Note: parse_album_header is parsed from response
        const album = parse_album_header_2024(response);
        const results = nav(response, [...NAV.SINGLE_COLUMN_TAB, ...NAV.SECTION_LIST_ITEM, ...NAV.MUSIC_SHELF]);
        album["tracks"] = parse_uploaded_items(results["contents"]);
        album["duration_seconds"] = sum_total_duration(album);
        return album;
    }

    public async upload_song(filepath: string): Promise<string> {
        this._check_auth();
        if (this.auth_type !== AuthType.BROWSER) {
            throw new YTMusicUserError("Please provide browser authentication before using this function");
        }
        
        const fs = await import('fs');
        const path = await import('path');
        if (!fs.existsSync(filepath) || !fs.statSync(filepath).isFile()) {
            throw new YTMusicUserError("The provided file does not exist.");
        }

        const supported_filetypes = ["mp3", "m4a", "wma", "flac", "ogg"];
        const ext = path.extname(filepath).substring(1).toLowerCase();
        if (!supported_filetypes.includes(ext)) {
            throw new YTMusicUserError(
                "The provided file type is not supported by YouTube Music. Supported file types are "
                + supported_filetypes.join(", ")
            );
        }

        const headers = await this._prepare_headers();
        const upload_url = `https://upload.youtube.com/upload/usermusic/http?authuser=${headers['x-goog-authuser']}`;
        const filesize = fs.statSync(filepath).size;
        if (filesize >= 314572800) {
            throw new YTMusicUserError(`File has size ${filesize} bytes, which is larger than the limit of 300MB`);
        }

        const filename = path.basename(filepath);
        const body = "filename=" + encodeURIComponent(filename);
        
        const upload_headers = { ...headers };
        delete upload_headers["content-encoding"];
        upload_headers["content-type"] = "application/x-www-form-urlencoded;charset=utf-8";
        upload_headers["X-Goog-Upload-Command"] = "start";
        upload_headers["X-Goog-Upload-Header-Content-Length"] = String(filesize);
        upload_headers["X-Goog-Upload-Protocol"] = "resumable";

        const start_response = await this._session.post(upload_url, body, { headers: upload_headers });
        const upload_url_session = start_response.headers["x-goog-upload-url"];
        
        const finalize_headers = { ...headers };
        delete finalize_headers["content-encoding"];
        finalize_headers["X-Goog-Upload-Command"] = "upload, finalize";
        finalize_headers["X-Goog-Upload-Offset"] = "0";

        const file_buffer = fs.readFileSync(filepath);
        const upload_response = await this._session.post(upload_url_session, file_buffer, { headers: finalize_headers });

        if (upload_response.status === 200) {
            return "STATUS_SUCCEEDED";
        } else {
            return upload_response.data;
        }
    }

    public async delete_upload_entity(entityId: string): Promise<string | JsonDict> {
        this._check_auth();
        const endpoint = "music/delete_privately_owned_entity";
        let cleanedEntityId = entityId;
        if (entityId.includes("FEmusic_library_privately_owned_release_detail")) {
            cleanedEntityId = entityId.replace("FEmusic_library_privately_owned_release_detail", "");
        }

        const body = { "entityId": cleanedEntityId };
        const response = await this._send_request(endpoint, body);

        if (!response.error) {
            return "STATUS_SUCCEEDED";
        } else {
            return response.error;
        }
    }

    public async get_watch_playlist(
        videoId: string | null = null,
        playlistId: string | null = null,
        limit: number = 25,
        radio: boolean = false,
        shuffle: boolean = false
    ): Promise<JsonDict> {
        const body: JsonDict = {
            "enablePersistentPlaylistPanel": true,
            "isAudioOnly": true,
            "tunerSettingValue": "AUTOMIX_SETTING_NORMAL",
        };
        if (!videoId && !playlistId) {
            throw new YTMusicUserError("You must provide either a video id, a playlist id, or both");
        }
        if (videoId) {
            body["videoId"] = videoId;
            if (!playlistId) {
                playlistId = "RDAMVM" + videoId;
            }
            if (!(radio || shuffle)) {
                body["watchEndpointMusicSupportedConfigs"] = {
                    "watchEndpointMusicConfig": {
                        "hasPersistentPlaylistPanel": true,
                        "musicVideoType": "MUSIC_VIDEO_TYPE_ATV",
                    }
                };
            }
        }
        let is_playlist = false;
        let finalPlaylistId = playlistId;
        if (playlistId) {
            const validated = validate_playlist_id(playlistId);
            finalPlaylistId = validated;
            is_playlist = validated.startsWith("PL") || validated.startsWith("OLA");
            body["playlistId"] = validated;
        }

        if (shuffle && playlistId !== null) {
            body["params"] = "wAEB8gECKAE%3D";
        }
        if (radio) {
            body["params"] = "wAEB";
        }
        const endpoint = "next";
        const response = await this._send_request(endpoint, body);
        const watchNextRenderer = nav(
            response,
            [
                "contents",
                "singleColumnMusicWatchNextResultsRenderer",
                "tabbedRenderer",
                "watchNextTabbedResultsRenderer",
            ]
        );

        const browse_ids = get_tab_browse_ids(watchNextRenderer);
        const lyrics_browse_id = browse_ids["MUSIC_PAGE_TYPE_TRACK_LYRICS"] || null;
        const related_browse_id = browse_ids["MUSIC_PAGE_TYPE_TRACK_RELATED"] || null;

        const results = nav(
            watchNextRenderer,
            [...NAV.TAB_CONTENT, "musicQueueRenderer", "content", "playlistPanelRenderer"],
            true
        );
        if (!results) {
            let msg = "No content returned by the server.";
            if (playlistId) {
                msg += `\nEnsure you have access to ${playlistId} - a private playlist may cause this.`;
            }
            throw new YTMusicServerError(msg);
        }

        let parsedPlaylistId: string | null = null;
        for (const item of results["contents"]) {
            const pid = nav(item, ["playlistPanelVideoRenderer", ...NAV.NAVIGATION_PLAYLIST_ID], true);
            if (pid) {
                parsedPlaylistId = pid;
                break;
            }
        }
        
        const tracks = parse_watch_playlist(results["contents"]);

        if ("continuations" in results) {
            const request_func = (additionalParams: string) => this._send_request(endpoint, body, additionalParams);
            const parse_func = (contents: JsonList) => parse_watch_playlist(contents);
            tracks.push(...(await get_continuations(
                results,
                "playlistPanelContinuation",
                limit - tracks.length,
                request_func,
                parse_func,
                is_playlist ? "" : "Radio"
            )));
        }

        return {
            tracks,
            playlistId: parsedPlaylistId,
            lyrics: lyrics_browse_id,
            related: related_browse_id
        };
    }

    public async get_streaming_data(videoId: string): Promise<JsonDict> {
        const apiKey = YTM_PARAMS_KEY.split("=")[1];
        const url = `${YTM_BASE_API}player?alt=json&key=${apiKey}`;
        const body = {
            "videoId": videoId,
            "contentCheckOk": true,
            "context": {
                "client": {
                    "clientName": "ANDROID_VR",
                    "clientVersion": "1.60.19",
                    "deviceMake": "Oculus",
                    "deviceModel": "Quest 3",
                    "osName": "Android",
                    "osVersion": "12L",
                    "platform": "MOBILE",
                    "hl": this.language,
                    "gl": "US",
                    "utcOffsetMinutes": 0
                }
            }
        };

        const headers = {
            "User-Agent": "com.google.android.apps.youtube.vr.oculus/1.60.19 (Linux; U; Android 12L; Quest 3 Build/SQ3A.220605.009.A1) gzip",
            "Origin": "https://music.youtube.com",
            "Content-Type": "application/json"
        };

        const response = await this._session.post(url, body, { headers });
        if (response.data.error) {
            throw new YTMusicServerError(response.data.error.message || "Player Request failed");
        }
        return response.data.streamingData || {};
    }

    public async get_stream_url(videoId: string): Promise<string | null> {
        const streamingData = await this.get_streaming_data(videoId);
        const formats = [
            ...(streamingData.formats || []),
            ...(streamingData.adaptiveFormats || [])
        ];

        const audioStreams = formats.filter((format: any) =>
            format.mimeType && format.mimeType.startsWith("audio/")
        );

        if (audioStreams.length === 0) {
            const videoStreams = formats.filter((format: any) => format.url);
            return videoStreams.length > 0 ? videoStreams[0].url : null;
        }

        audioStreams.sort((a: any, b: any) => {
            const itagA = a.itag;
            const itagB = b.itag;
            if (itagA === 251) return -1;
            if (itagB === 251) return 1;
            if (itagA === 140) return -1;
            if (itagB === 140) return 1;
            return (b.bitrate || 0) - (a.bitrate || 0);
        });

        const bestStream = audioStreams.find((format: any) => format.url);
        return bestStream ? bestStream.url : null;
    }
}
