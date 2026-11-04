/**
 * Colour themes ported from the typeit client. Each is six colours (subAlt, typeit's card
 * colour, is not used: LRC Studio derives its surfaces from bg and text). `dark` and `light`
 * are not here: they are the built-in Rosé Pine themes defined in index.css.
 *
 *   bg    page background
 *   main  the theme's colour: primary buttons, accents
 *   sub   secondary text and labels
 *   text  main text
 *   error destructive actions and mistakes
 */
export type ThemePalette = { id: string; name: string; bg: string; main: string; sub: string; text: string; error: string };

export const PALETTES: readonly ThemePalette[] = [
  { id: 'crimson', name: 'crimson', bg: '#0a0a0b', main: '#c8102e', sub: '#a9a5ad', text: '#f2efea', error: '#ff3b4f' },
  { id: 'ocean', name: 'ocean', bg: '#0b1220', main: '#3fa7ff', sub: '#7d8fa9', text: '#e3ecf7', error: '#ff5d73' },
  { id: 'forest', name: 'forest', bg: '#0e1410', main: '#5cd65c', sub: '#869a88', text: '#e4efe4', error: '#ff6b6b' },
  { id: 'carbon', name: 'carbon', bg: '#313131', main: '#f66e0d', sub: '#616161', text: '#f5e6c8', error: '#e72d2d' },
  { id: 'slate-honey', name: 'slate honey', bg: '#323437', main: '#e2b714', sub: '#646669', text: '#d1d0c5', error: '#ca4754' },
  { id: 'paper', name: 'paper', bg: '#eeeeee', main: '#444444', sub: '#b2b2b2', text: '#444444', error: '#d70000' },
  { id: 'midnight', name: 'midnight', bg: '#0b0e13', main: '#60759f', sub: '#394760', text: '#9fadc6', error: '#c26170' },
  { id: 'nord', name: 'nord', bg: '#242933', main: '#88c0d0', sub: '#6d7686', text: '#eceff4', error: '#bf616a' },
  { id: 'nord-light', name: 'nord light', bg: '#eceff4', main: '#5e81ac', sub: '#8a96aa', text: '#2e3440', error: '#bf616a' },
  { id: 'dracula', name: 'dracula', bg: '#282a36', main: '#bd93f9', sub: '#6272a4', text: '#f8f8f2', error: '#ff5555' },
  { id: 'gruvbox-dark', name: 'gruvbox dark', bg: '#282828', main: '#d79921', sub: '#665c54', text: '#ebdbb2', error: '#fb4934' },
  { id: 'gruvbox-light', name: 'gruvbox light', bg: '#fbf1c7', main: '#689d6a', sub: '#a89984', text: '#3c3836', error: '#cc241d' },
  { id: 'solarized-dark', name: 'solarized dark', bg: '#002b36', main: '#859900', sub: '#2aa198', text: '#268bd2', error: '#d33682' },
  { id: 'solarized-light', name: 'solarized light', bg: '#fdf6e3', main: '#859900', sub: '#2aa198', text: '#181819', error: '#d33682' },
  { id: 'monokai', name: 'monokai', bg: '#272822', main: '#f92672', sub: '#75715e', text: '#e2e2dc', error: '#fd971f' },
  { id: 'catppuccin', name: 'catppuccin', bg: '#1e1e2e', main: '#cba6f7', sub: '#7f849c', text: '#cdd6f4', error: '#f38ba8' },
  { id: 'catppuccin-latte', name: 'catppuccin latte', bg: '#eff1f5', main: '#8839ef', sub: '#8c8fa1', text: '#4c4f69', error: '#d20f39' },
  { id: 'tokyo-night', name: 'tokyo night', bg: '#1a1b26', main: '#7aa2f7', sub: '#565f89', text: '#c0caf5', error: '#f7768e' },
  { id: 'rose-pine', name: 'rose pine', bg: '#191724', main: '#ebbcba', sub: '#6e6a86', text: '#e0def4', error: '#eb6f92' },
  { id: 'rose-pine-dawn', name: 'rose pine dawn', bg: '#faf4ed', main: '#d7827e', sub: '#9893a5', text: '#575279', error: '#b4637a' },
  { id: 'everforest', name: 'everforest', bg: '#2d353b', main: '#a7c080', sub: '#859289', text: '#d3c6aa', error: '#e67e80' },
  { id: 'one-dark', name: 'one dark', bg: '#282c34', main: '#61afef', sub: '#5c6370', text: '#abb2bf', error: '#e06c75' },
  { id: 'github-dark', name: 'github dark', bg: '#0d1117', main: '#58a6ff', sub: '#6e7681', text: '#c9d1d9', error: '#f85149' },
  { id: 'material', name: 'material', bg: '#263238', main: '#80cbc4', sub: '#4c6772', text: '#e6edf3', error: '#fb4934' },
  { id: 'synthwave', name: 'synthwave', bg: '#262335', main: '#f97e72', sub: '#848bbd', text: '#ffffff', error: '#fe4450' },
  { id: 'vaporwave', name: 'vaporwave', bg: '#a4a7ea', main: '#e368da', sub: '#c1c4f5', text: '#f1ebf1', error: '#28cbe0' },
  { id: 'bento', name: 'bento', bg: '#2d394d', main: '#ff7a90', sub: '#4a768d', text: '#fffaf8', error: '#ee2a3a' },
  { id: 'botanical', name: 'botanical', bg: '#7b9c98', main: '#eaf1f3', sub: '#495755', text: '#eaf1f3', error: '#f6c9b4' },
  { id: 'aurora', name: 'aurora', bg: '#011926', main: '#00e980', sub: '#245c69', text: '#fff7e6', error: '#b94da1' },
  { id: 'beach', name: 'beach', bg: '#ffeead', main: '#96ceb4', sub: '#ffcc5c', text: '#5b7869', error: '#ff6f69' },
  { id: 'honey', name: 'honey', bg: '#f2aa00', main: '#fff546', sub: '#a66b00', text: '#f3eecb', error: '#df3333' },
  { id: 'lavender', name: 'lavender', bg: '#ada6c2', main: '#e4e3e9', sub: '#e4e3e9', text: '#2f2a41', error: '#ca4754' },
  { id: 'matrix', name: 'matrix', bg: '#000000', main: '#15ff00', sub: '#006500', text: '#d1ffcd', error: '#da3333' },
  { id: 'terminal', name: 'terminal', bg: '#191a1b', main: '#79a617', sub: '#48494b', text: '#e7eae0', error: '#a61717' },
  { id: 'serene', name: 'serene', bg: '#111111', main: '#ffcf5a', sub: '#5b5b5b', text: '#dfdfdf', error: '#d44c4c' },
  { id: 'cyberpunk', name: 'cyberpunk', bg: '#0b0b19', main: '#f9f002', sub: '#4b4b7a', text: '#00f0ff', error: '#ff003c' },
  { id: 'coffee', name: 'coffee', bg: '#2b1d16', main: '#c69c6d', sub: '#6e5243', text: '#efe0cf', error: '#e05a47' },
  { id: 'sakura', name: 'sakura', bg: '#fbe8ee', main: '#d1557a', sub: '#c8a3af', text: '#5a3a46', error: '#b5172e' },
  { id: 'mint', name: 'mint', bg: '#e8f5ef', main: '#2a9d74', sub: '#8fb5a5', text: '#1f3a2f', error: '#d64045' },
  { id: 'arctic', name: 'arctic', bg: '#f5f9fc', main: '#2f7bbf', sub: '#9aaebe', text: '#1c2b38', error: '#d1343e' },
  { id: 'iceberg-dark', name: 'iceberg dark', bg: '#161821', main: '#84a0c6', sub: '#595e76', text: '#c6c8d1', error: '#e27878' },
  { id: 'iceberg-light', name: 'iceberg light', bg: '#e8e9ec', main: '#2d539e', sub: '#adb1c4', text: '#33374c', error: '#cc517a' },
  { id: 'olivia', name: 'olivia', bg: '#1c1b1d', main: '#deaf9d', sub: '#4e3b42', text: '#f2efed', error: '#bf616a' },
  { id: 'red-dragon', name: 'red dragon', bg: '#1a0b0c', main: '#ff3a32', sub: '#e2a528', text: '#4a4d4e', error: '#771b1f' },
  { id: 'night-runner', name: 'night runner', bg: '#212121', main: '#feff04', sub: '#5c4a9c', text: '#e8e8e8', error: '#da3333' },
  { id: 'bliss', name: 'bliss', bg: '#262727', main: '#f0d3c9', sub: '#665957', text: '#fff2ee', error: '#bd4141' },
  { id: 'dots', name: 'dots', bg: '#121520', main: '#fff', sub: '#676e8a', text: '#fff', error: '#da3333' },
];
