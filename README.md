# ytmusicapi-js

An unofficial API for YouTube Music, ported to TypeScript and Node.js.

> [!NOTE]
> This project is an AI-assisted port and maintenance work, referenced directly from the original Python [ytmusicapi](https://github.com/sigma67/ytmusicapi) library by [@sigma67](https://github.com/sigma67).

## Features

- **Search**: Search for songs, videos, albums, artists, playlists, episodes, and podcasts with custom filters and scopes.
- **Browsing**: Retrieve details for albums, artists, individual tracks, and song credits.
- **Library**: List and manage playlists, saved songs, albums, artists, subscribed channels, and listen history.
- **Playlists**: Create, edit, delete, collaborate on, and manage items inside playlists.
- **Explore & Charts**: Fetch new releases, trending content, global/regional charts, and mood/genre playlists.
- **Podcasts**: Fetch show information, episodes list, episode details, and channel updates.
- **Uploads**: Upload audio files (`mp3`, `m4a`, `flac`, etc.) directly to YouTube Music and manage user-uploaded tracks, albums, or artists.
- **Watch & Radio**: Generate queue watchlists and radio stations based on track/playlist seeding.
- **Streaming**: Extract direct, unsigned audio stream URLs for tracks by mimicking Innertube mobile client payloads.
- **Authentication**: Set up and parse browser-based request headers to access authenticated and personal account endpoints.

## Installation

To install dependencies:

```bash
npm install
```

## Build

To compile the TypeScript source files to the `dist` folder:

```bash
npm run build
```

## Testing

The project uses [Vitest](https://vitest.dev/) for unit and integration testing. To run the tests:

```bash
npm run test
```

## API Reference

The main `YTMusic` class exposes the following public methods:

### Search
* **`search(query: string, filter?: string | null, scope?: string | null, limit?: number, ignore_spelling?: boolean): Promise<JsonList>`**
  * Searches YouTube Music for a given query.
* **`get_search_suggestions(query: string, detailed_runs?: boolean): Promise<string[] | JsonList>`**
  * Retrieves search suggestions for the provided query string.

### Browsing
* **`get_artist(channelId: string): Promise<JsonDict>`**
  * Fetches detailed information about an artist.
* **`get_album(browseId: string): Promise<JsonDict>`**
  * Retrieves metadata and tracklist of an album.
* **`get_song_credits(browseId: string): Promise<JsonDict>`**
  * Fetches credit sections for a specific song.

### Songs & Playlists
* **`get_song(videoId: string): Promise<JsonDict>`**
  * Returns metadata and playback signature details for a song.
* **`get_playlist(playlistId: string, limit?: number | null, related?: boolean, suggestions_limit?: number): Promise<JsonDict>`**
  * Fetches the contents of a public or authorized playlist.
* **`get_liked_songs(limit?: number): Promise<JsonDict>`**
  * Gets items from the "Liked Songs" playlist.
* **`get_saved_episodes(limit?: number): Promise<JsonDict>`**
  * Gets items from the "Saved Episodes" playlist.
* **`create_playlist(title: string, description: string, privacy_status?: string, video_ids?: string[] | null, source_playlist?: string | null): Promise<string | JsonDict>`**
  * Creates a new playlist.
* **`edit_playlist(playlistId: string, options?: { title?: string, description?: string, privacyStatus?: string, collaboration?: boolean, moveItem?: string | [string, string], addPlaylistId?: string, sortOrder?: PlaylistSortOrder, addToTop?: boolean, voteOption?: PlaylistVoteEditOptions }): Promise<string | JsonDict>`**
  * Edits metadata or tracks within a playlist.
* **`delete_playlist(playlistId: string): Promise<string | JsonDict>`**
  * Deletes a playlist.
* **`add_playlist_items(playlistId: string, videoIds?: string[] | null, source_playlist?: string | null, duplicates?: boolean): Promise<any>`**
  * Adds songs to a playlist.
* **`remove_playlist_items(playlistId: string, videos: JsonList): Promise<string | JsonDict>`**
  * Removes songs from a playlist.

### Library
* **`get_library_playlists(limit?: number | null): Promise<JsonList>`**
  * Retrieves playlists in the user's library.
* **`get_library_songs(limit?: number | null, validate_responses?: boolean, order?: LibraryOrderType | null): Promise<JsonList>`**
  * Gets songs in the user's library.
* **`get_library_albums(limit?: number | null, order?: LibraryOrderType | null): Promise<JsonList>`**
  * Gets albums in the library.
* **`get_library_artists(limit?: number | null, order?: LibraryOrderType | null): Promise<JsonList>`**
  * Gets artists in the library.
* **`get_library_subscriptions(limit?: number | null, order?: LibraryOrderType | null): Promise<JsonList>`**
  * Gets subscribed artists.
* **`get_library_podcasts(limit?: number | null, order?: LibraryOrderType | null): Promise<JsonList>`**
  * Gets podcasts in the library.
* **`get_library_channels(limit?: number | null, order?: LibraryOrderType | null): Promise<JsonList>`**
  * Gets subscribed channels.
* **`get_history(): Promise<JsonList>`**
  * Gets play history.
* **`add_history_item(song: JsonDict): Promise<any>`**
  * Adds a song to history.
* **`remove_history_items(feedbackTokens: string[]): Promise<JsonDict>`**
  * Removes items from play history.
* **`rate_song(videoId: string, rating?: LikeStatus): Promise<JsonDict | null>`**
  * Rates a song.
* **`edit_song_library_status(feedbackTokens?: string[] | null): Promise<JsonDict>`**
  * Adds or removes songs from library/listen again.
* **`rate_playlist(playlistId: string, rating?: LikeStatus): Promise<JsonDict>`**
  * Rates/adds an album/playlist to library.
* **`subscribe_artists(channelIds: string[]): Promise<JsonDict>`**
  * Subscribes to artists.
* **`unsubscribe_artists(channelIds: string[]): Promise<JsonDict>`**
  * Unsubscribes from artists.
* **`get_account_info(): Promise<JsonDict>`**
  * Gets current user profile details.

### Explore & Charts
* **`get_explore(): Promise<JsonDict>`**
  * Gets new releases, top songs, trending, etc.
* **`get_charts(country?: string): Promise<JsonDict>`**
  * Gets video, artist, and genre charts by country.
* **`get_mood_categories(): Promise<JsonDict>`**
  * Gets moods and genres categories.
* **`get_mood_playlists(params: string): Promise<JsonList>`**
  * Retrieves playlists in a given moods/genres category.

### Podcasts
* **`get_channel(channelId: string): Promise<JsonDict>`**
  * Gets information about a podcast channel.
* **`get_channel_episodes(channelId: string, params: string): Promise<JsonList>`**
  * Gets all episodes of a channel.
* **`get_podcast(playlistId: string, limit?: number | null): Promise<JsonDict>`**
  * Gets podcast show metadata and episodes list.
* **`get_episode(videoId: string): Promise<JsonDict>`**
  * Gets single podcast episode details.
* **`get_episodes_playlist(playlist_id?: string): Promise<JsonDict>`**
  * Gets episodes inside an episodes playlist (like "New Episodes").

### Uploads
* **`get_library_upload_songs(limit?: number | null, order?: LibraryOrderType | null): Promise<JsonList>`**
  * Lists uploaded songs.
* **`get_library_upload_albums(limit?: number | null, order?: LibraryOrderType | null): Promise<JsonList>`**
  * Lists uploaded albums.
* **`get_library_upload_artists(limit?: number | null, order?: LibraryOrderType | null): Promise<JsonList>`**
  * Lists uploaded artists.
* **`get_library_upload_artist(browseId: string, limit?: number): Promise<JsonList>`**
  * Lists uploaded songs of an artist.
* **`get_library_upload_album(browseId: string): Promise<JsonDict>`**
  * Gets uploaded album metadata and tracks.
* **`upload_song(filepath: string): Promise<string>`**
  * Uploads a song file.
* **`delete_upload_entity(entityId: string): Promise<string | JsonDict>`**
  * Deletes an uploaded song or album.

### Watch
* **`get_watch_playlist(videoId?: string | null, playlistId?: string | null, limit?: number, radio?: boolean, shuffle?: boolean): Promise<JsonDict>`**
  * Generates a watch panel track queue (radio/related items).

### Streaming
* **`get_streaming_data(videoId: string): Promise<JsonDict>`**
  * Fetches raw streaming formats/metadata using the unencrypted `ANDROID_VR` mobile client client definition.
* **`get_stream_url(videoId: string): Promise<string | null>`**
  * Returns the direct unsigned audio streaming URL (prioritizing Opus `251` and AAC `140` streams).

---

## Authentication Setup

To access authenticated endpoints:
* **`setup_browser(filepath?: string | null, headers_raw?: string | null): Promise<string>`**
  * Generates authentication credentials by parsing browser request headers.

## Quick Start

```typescript
import { YTMusic } from './index';

async function main() {
    const yt = new YTMusic();
    
    // Search for music
    const results = await yt.search("Oasis Wonderwall");
    console.log(results[0]);
    
    // Get artist details
    const artist = await yt.get_artist("MPLAUCmMUZbaYdNH0bEd1PAlAqsA");
    console.log(artist.name); // "Oasis"
}

main();
```
