import { nav, find_objects_by_key } from '../helpers';
import { JsonDict, JsonList } from '../helpers';
import { DOT_SEPARATOR_RUN } from './constants';

export function parse_menu_playlists(data: JsonDict, result: JsonDict): void {
    const MENU_ITEMS = ["menu", "menuRenderer", "items"];
    const MNIR = "menuNavigationItemRenderer";
    const ICON_TYPE = ["icon", "iconType"];

    const menu_items = nav(data, MENU_ITEMS, true);
    if (!menu_items) return;

    const watch_menu = find_objects_by_key(menu_items, MNIR);

    for (const wrapper of watch_menu) {
        const item = wrapper[MNIR];
        const icon = nav(item, ICON_TYPE);

        let watch_key;
        if (icon === "MUSIC_SHUFFLE") {
            watch_key = "shuffleId";
        } else if (icon === "MIX") {
            watch_key = "radioId";
        } else {
            continue;
        }

        let watch_id = nav(item, ["navigationEndpoint", "watchPlaylistEndpoint", "playlistId"], true);
        if (!watch_id) {
            watch_id = nav(item, ["navigationEndpoint", "watchEndpoint", "playlistId"], true);
        }

        if (watch_id) {
            result[watch_key] = watch_id;
        }
    }
}

export function get_item_text(item: JsonDict, index: int, run_index: int = 0, none_if_absent: boolean = false): string | null {
    const column = get_flex_column_item(item, index);
    if (!column) return null;

    // @ts-ignore
    if (none_if_absent && column.text.runs.length < run_index + 1) {
        return null;
    }
    // @ts-ignore
    return column.text.runs[run_index].text;
}

export function get_flex_column_item(item: JsonDict, index: int): JsonDict | null {
    if (
        item.flexColumns.length <= index ||
        !item.flexColumns[index].musicResponsiveListItemFlexColumnRenderer.text ||
        !item.flexColumns[index].musicResponsiveListItemFlexColumnRenderer.text.runs
    ) {
        return null;
    }
    return item.flexColumns[index].musicResponsiveListItemFlexColumnRenderer;
}

export function get_fixed_column_item(item: JsonDict, index: int): JsonDict | null {
    if (
        !item.fixedColumns[index].musicResponsiveListItemFixedColumnRenderer.text ||
        !item.fixedColumns[index].musicResponsiveListItemFixedColumnRenderer.text.runs
    ) {
        return null;
    }
    return item.fixedColumns[index].musicResponsiveListItemFixedColumnRenderer;
}

export function get_dot_separator_index(runs: JsonList): number {
    const index = runs.findIndex((run: any) => run.text === DOT_SEPARATOR_RUN.text);
    return index === -1 ? runs.length : index;
}

export function parse_duration(duration: string | null): number | null {
    if (!duration || !duration.trim()) return null;

    const duration_split = duration.trim().split(":");

    if (!duration_split.every(d => /^\d+$/.test(d))) return null;

    const multipliers = [1, 60, 3600];
    const parts = duration_split.reverse();

    let seconds = 0;
    for (let i = 0; i < parts.length; i++) {
        seconds += parseInt(parts[i], 10) * multipliers[i];
    }
    return seconds;
}

export function parse_id_name(sub_run: JsonDict | null): JsonDict {
    const NAVIGATION_BROWSE_ID = ["navigationEndpoint", "browseEndpoint", "browseId"];

    return {
        "id": nav(sub_run, NAVIGATION_BROWSE_ID, true),
        "name": nav(sub_run, ["text"], true),
    };
}

// Helper types
type int = number;
