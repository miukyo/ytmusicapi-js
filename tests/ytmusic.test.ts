import { describe, it, expect } from 'vitest';
import { YTMusic } from '../index';
import { YTMusicUserError } from '../exceptions';

describe('YTMusic Class Instantiation', () => {
    it('instantiates YTMusic successfully', () => {
        const yt = new YTMusic();
        expect(yt).toBeInstanceOf(YTMusic);
    });

    it('throws auth error for invalid auth argument', () => {
        expect(() => new YTMusic("def")).toThrow(YTMusicUserError);
        expect(() => new YTMusic("def")).toThrow(/Invalid auth/);
    });
});
