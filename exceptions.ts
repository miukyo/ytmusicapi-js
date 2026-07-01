export class YTMusicError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "YTMusicError";
    }
}

export class YTMusicServerError extends YTMusicError {
    constructor(message: string) {
        super(message);
        this.name = "YTMusicServerError";
    }
}

export class YTMusicUserError extends YTMusicError {
    constructor(message: string) {
        super(message);
        this.name = "YTMusicUserError";
    }
}
