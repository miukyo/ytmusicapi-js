// Port of navigation.py
// This file contains commonly used navigation paths (arrays of strings/integers)

export const CONTENT = ["contents", 0];
export const RUN_TEXT = ["runs", 0, "text"];
export const TAB_CONTENT = ["tabs", 0, "tabRenderer", "content"];
export const TAB_1_CONTENT = ["tabs", 1, "tabRenderer", "content"];
export const TAB_2_CONTENT = ["tabs", 2, "tabRenderer", "content"];
export const TWO_COLUMN_RENDERER = ["contents", "twoColumnBrowseResultsRenderer"];
export const SINGLE_COLUMN = ["contents", "singleColumnBrowseResultsRenderer"];
export const SINGLE_COLUMN_TAB = [...SINGLE_COLUMN, ...TAB_CONTENT];
export const SECTION = ["sectionListRenderer"];
export const SECTION_LIST = [...SECTION, "contents"];
export const SECTION_LIST_ITEM = [...SECTION, ...CONTENT];
export const RESPONSIVE_HEADER = ["musicResponsiveHeaderRenderer"];
export const ITEM_SECTION = ["itemSectionRenderer", ...CONTENT];
export const MUSIC_SHELF = ["musicShelfRenderer"];
export const GRID = ["gridRenderer"];
export const GRID_ITEMS = [...GRID, "items"];
export const MENU = ["menu", "menuRenderer"];
export const MENU_ITEMS = [...MENU, "items"];
export const MENU_LIKE_STATUS = [...MENU, "topLevelButtons", 0, "likeButtonRenderer", "likeStatus"];
export const MENU_SERVICE = ["menuServiceItemRenderer", "serviceEndpoint"];
export const TOGGLE_MENU = "toggleMenuServiceItemRenderer";
export const OVERLAY_RENDERER = ["musicItemThumbnailOverlayRenderer", "content", "musicPlayButtonRenderer"];
export const PLAY_BUTTON = ["overlay", ...OVERLAY_RENDERER];
export const NAVIGATION_BROWSE = ["navigationEndpoint", "browseEndpoint"];
export const NAVIGATION_BROWSE_ID = [...NAVIGATION_BROWSE, "browseId"];
export const PAGE_TYPE = ["browseEndpointContextSupportedConfigs", "browseEndpointContextMusicConfig", "pageType"];
export const WATCH_VIDEO_ID = ["watchEndpoint", "videoId"];
export const PLAYLIST_ID = ["playlistId"];
export const WATCH_PLAYLIST_ID = ["watchEndpoint", ...PLAYLIST_ID];
export const NAVIGATION_VIDEO_ID = ["navigationEndpoint", ...WATCH_VIDEO_ID];
export const QUEUE_VIDEO_ID = ["queueAddEndpoint", "queueTarget", "videoId"];
export const NAVIGATION_PLAYLIST_ID = ["navigationEndpoint", ...WATCH_PLAYLIST_ID];
export const WATCH_PID = ["watchPlaylistEndpoint", ...PLAYLIST_ID];
export const NAVIGATION_WATCH_PLAYLIST_ID = ["navigationEndpoint", ...WATCH_PID];
export const NAVIGATION_VIDEO_TYPE = [
    "watchEndpoint",
    "watchEndpointMusicSupportedConfigs",
    "watchEndpointMusicConfig",
    "musicVideoType",
];
export const ICON_TYPE = ["icon", "iconType"];
export const TOGGLED_BUTTON = ["toggleButtonRenderer", "isToggled"];
export const TITLE = ["title", "runs", 0];
export const TITLE_TEXT = ["title", ...RUN_TEXT];
export const TEXT_RUNS = ["text", "runs"];
export const TEXT_RUN = [...TEXT_RUNS, 0];
export const TEXT_RUN_TEXT = [...TEXT_RUN, "text"];
export const SUBTITLE = ["subtitle", ...RUN_TEXT];
export const SUBTITLE_RUNS = ["subtitle", "runs"];
export const SUBTITLE_RUN = [...SUBTITLE_RUNS, 0];
export const SUBTITLE2 = [...SUBTITLE_RUNS, 2, "text"];
export const SUBTITLE3 = [...SUBTITLE_RUNS, 4, "text"];
export const THUMBNAIL = ["thumbnail", "thumbnails"];
export const THUMBNAILS = ["thumbnail", "musicThumbnailRenderer", ...THUMBNAIL];
export const THUMBNAIL_RENDERER = ["thumbnailRenderer", "musicThumbnailRenderer", ...THUMBNAIL];
export const THUMBNAIL_OVERLAY_NAVIGATION = ["thumbnailOverlay", ...OVERLAY_RENDERER, "playNavigationEndpoint"];
export const THUMBNAIL_OVERLAY = [...THUMBNAIL_OVERLAY_NAVIGATION, ...WATCH_PID];
export const THUMBNAIL_CROPPED = ["thumbnail", "croppedSquareThumbnailRenderer", ...THUMBNAIL];
export const FEEDBACK_TOKEN = ["feedbackEndpoint", "feedbackToken"];
export const BADGE_PATH = [0, "musicInlineBadgeRenderer", "accessibilityData", "accessibilityData", "label"];
export const BADGE_LABEL = ["badges", ...BADGE_PATH];
export const SUBTITLE_BADGE_LABEL = ["subtitleBadges", ...BADGE_PATH];
export const CATEGORY_TITLE = ["musicNavigationButtonRenderer", "buttonText", ...RUN_TEXT];
export const CATEGORY_PARAMS = ["musicNavigationButtonRenderer", "clickCommand", "browseEndpoint", "params"];
export const MMRIR = "musicMultiRowListItemRenderer";
export const MRLIR = "musicResponsiveListItemRenderer";
export const MTRIR = "musicTwoRowItemRenderer";
export const MNIR = "menuNavigationItemRenderer";
export const TASTE_PROFILE_ITEMS = ["contents", "tastebuilderRenderer", "contents"];
export const TASTE_PROFILE_ARTIST = ["title", "runs"];
export const SECTION_LIST_CONTINUATION = ["continuationContents", "sectionListContinuation"];
export const MENU_PLAYLIST_ID = [...MENU_ITEMS, 0, MNIR, ...NAVIGATION_WATCH_PLAYLIST_ID];
export const MULTI_SELECT = ["musicMultiSelectMenuItemRenderer"];
export const HEADER = ["header"];
export const HEADER_DETAIL = [...HEADER, "musicDetailHeaderRenderer"];
export const EDITABLE_PLAYLIST_DETAIL_HEADER = ["musicEditablePlaylistDetailHeaderRenderer"];
export const HEADER_EDITABLE_DETAIL = [...HEADER, ...EDITABLE_PLAYLIST_DETAIL_HEADER];
export const HEADER_SIDE = [...HEADER, "musicSideAlignedItemRenderer"];
export const HEADER_MUSIC_VISUAL = [...HEADER, "musicVisualHeaderRenderer"];
export const DESCRIPTION_SHELF = ["musicDescriptionShelfRenderer"];
export const DESCRIPTION = ["description", ...RUN_TEXT];
export const DESCRIPTION_RUN_LIST = ["description", RUN_TEXT[0]];
export const CAROUSEL = ["musicCarouselShelfRenderer"];
export const IMMERSIVE_CAROUSEL = ["musicImmersiveCarouselShelfRenderer"];
export const CAROUSEL_CONTENTS = [...CAROUSEL, "contents"];
export const CAROUSEL_TITLE = [...HEADER, "musicCarouselShelfBasicHeaderRenderer", ...TITLE];
export const CARD_SHELF_TITLE = [...HEADER, "musicCardShelfHeaderBasicRenderer", ...TITLE_TEXT];
export const FRAMEWORK_MUTATIONS = ["frameworkUpdates", "entityBatchUpdate", "mutations"];
export const TIMESTAMPED_LYRICS = [
    "contents",
    "elementRenderer",
    "newElement",
    "type",
    "componentType",
    "model",
    "timedLyricsModel",
    "lyricsData",
];
export const ENGAGEMENT_BAR = [
    "engagementBar",
    "engagementBarViewModel",
    "actions",
    0,
    "votingViewModel",
    "initialState",
];
export const CREDITS_SECTIONS = [
    "onResponseReceivedActions",
    0,
    "openPopupAction",
    "popup",
    "dismissableDialogRenderer",
    "sections",
];

