/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#122230',
    tint: '#1f8f72',

    // Core surfaces
    background: '#f8f7f1',
    foreground: '#122230',

    // Cards / elevated surfaces
    card: '#fffdf8',
    cardForeground: '#122230',

    // Primary action color (buttons, links, active states)
    primary: '#1f8f72',
    primaryForeground: '#ffffff',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#e7eee9',
    secondaryForeground: '#122230',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#e9ebe5',
    mutedForeground: '#61716e',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#f7d7c9',
    accentForeground: '#122230',

    // Destructive actions (delete, error states)
    destructive: '#c84c45',
    destructiveForeground: '#ffffff',

    // Borders and input outlines
    border: '#dbe1d9',
    input: '#dbe1d9',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 8,
};

export default colors;
