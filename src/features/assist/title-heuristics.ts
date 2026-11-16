const YOUTUBE_ID = /\[[A-Za-z0-9_-]{11}\]/;
// \b is ASCII-only, so explicit non-letter lookarounds keep "vídeo" matching and "Unofficial" out.
const BRACKET_NOISE = /[([{][^)\]}]*(?<![\p{L}\p{N}])(?:official|oficial|audio|video|vídeo|lyrics?|letra|visualizer|mv|hd|4k|remaster(?:ed)?)(?![\p{L}\p{N}])[^)\]}]*[)\]}]/iu;
const BARE_OFFICIAL = /(?<![\p{L}\p{N}])(?:official|oficial)(?![\p{L}\p{N}])/iu;

/** True for titles that look pasted from a video site, so a cleanup offer makes sense. A bare `(feat. …)` is not one: that is TitleFeatSuggestion's job. */
export function looksLikeVideoTitle(title: string): boolean {
  return YOUTUBE_ID.test(title) || BRACKET_NOISE.test(title) || BARE_OFFICIAL.test(title);
}
