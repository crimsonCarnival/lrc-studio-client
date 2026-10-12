export default {
  success: [
    "Successfully imported {{count}} lines.",
    "{{count}} lines ready to sync.",
    "Loaded {{count}} lines perfectly.",
    "Import complete. {{count}} lines added."
  ],
  failed: "Couldn't parse this lyrics file. Please check the formatting and try again.",
  noLines: "We couldn't detect any text in this file. Make sure it's not empty.",
  tooLarge: "This file is too large (Maximum size: 5MB).",
  unsupportedFormat: "Unsupported file type. Please use standard .lrc, .srt, or .txt formats.",
  pasteLabel: "Paste the lyrics, one line per verse",
  fromFile: "Import .lrc / .srt / .txt",
  fromUrl: "Import from URL",
  urlPlaceholder: "https://example.com/lyrics.lrc",
  fetchError: "Failed to fetch. Check if the URL is correct and the file is accessible.",
  invalidUrl: "Invalid link format. Make sure it starts with http:// or https://"
};
