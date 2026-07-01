import { nav } from './helpers';
import { JsonDict, JsonList } from './helpers';

export const CONTINUATION_TOKEN = ["continuationItemRenderer", "continuationEndpoint", "continuationCommand", "token"];
export const COMMAND_EXECUTOR_COMMANDS = [
    "continuationItemRenderer",
    "continuationEndpoint",
    "commandExecutorCommand",
    "commands",
];
export const CONTINUATION_ITEMS = ["onResponseReceivedActions", 0, "appendContinuationItemsAction", "continuationItems"];

export function get_continuation_token(results: JsonList): string | null {
    if (results.length === 0) return null;
    const last_result = results[results.length - 1];

    const token = nav(last_result, CONTINUATION_TOKEN, true);
    if (token) return token as string;

    const commands = nav(last_result, COMMAND_EXECUTOR_COMMANDS, true) || [];
    for (const command of commands) {
        if (nav(command, ["continuationCommand", "request"], true) === "CONTINUATION_REQUEST_TYPE_BROWSE") {
            return nav(command, ["continuationCommand", "token"]) as string;
        }
    }

    return null;
}


export async function get_continuations(
    results: JsonDict,
    continuation_type: string,
    limit: number | null,
    request_func: (params: string) => Promise<JsonDict>,
    parse_func: (contents: JsonList) => JsonList,
    ctoken_path: string = "",
    additionalParams: string | null = null,
): Promise<JsonList> {
    const items: JsonList = [];
    while ("continuations" in results && (limit === null || items.length < limit)) {
        const additional_params = additionalParams || get_continuation_params(results, ctoken_path);
        const response = await request_func(additional_params);

        if ("continuationContents" in response) {
            results = response["continuationContents"][continuation_type];
        } else {
            break;
        }

        const contents = get_continuation_contents(results, parse_func);
        if (contents.length === 0) break;

        items.push(...contents);
    }
    return items;
}

export async function get_continuations_2025(
    results: JsonDict,
    limit: number | null,
    request_func: (body: JsonDict) => Promise<JsonDict>,
    parse_func: (contents: JsonList) => JsonList,
): Promise<JsonList> {
    const items: JsonList = [];
    let continuation_token = get_continuation_token(results["contents"]);

    while (continuation_token && (limit === null || items.length < limit)) {
        const response = await request_func({ "continuation": continuation_token });
        const continuation_items = nav(response, CONTINUATION_ITEMS, true);
        if (!continuation_items) break;

        const contents = parse_func(continuation_items);
        if (contents.length === 0) break;

        items.push(...contents);
        continuation_token = get_continuation_token(continuation_items);
    }
    return items;
}

export function get_continuation_params(results: JsonDict, ctoken_path: string = ""): string {
    const ctoken = nav(results, ["continuations", 0, "next" + ctoken_path + "ContinuationData", "continuation"]);
    return get_continuation_string(ctoken);
}

export function get_reloadable_continuation_params(results: JsonDict): string {
    const ctoken = nav(results, ["continuations", 0, "reloadContinuationData", "continuation"]);
    return get_continuation_string(ctoken);
}

export function get_continuation_string(ctoken: string): string {
    return "&ctoken=" + ctoken + "&continuation=" + ctoken;
}

export function get_continuation_contents(continuation: JsonDict, parse_func: (contents: JsonList) => JsonList): JsonList {
    for (const term of ["contents", "items"]) {
        if (term in continuation) {
            return parse_func(continuation[term]);
        }
    }
    return [];
}

export async function get_reloadable_continuations(
    results: JsonDict,
    continuation_type: string,
    limit: number | null,
    request_func: (params: string) => Promise<JsonDict>,
    parse_func: (contents: JsonList) => JsonList,
): Promise<JsonList> {
    const additionalParams = get_reloadable_continuation_params(results);
    return get_continuations(
        results,
        continuation_type,
        limit,
        request_func,
        parse_func,
        "",
        additionalParams
    );
}
