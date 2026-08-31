/** @type {import('tailwindcss').Config} */
// The theme extends from the custom properties in src/styles/tokens.css. No
// colour value is defined here — if a hex appears in this file, the token file
// has been bypassed.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "var(--kmc-red)",
          deep: "var(--kmc-red-deep)",
          wash: "var(--kmc-red-wash)",
          tint: "var(--kmc-red-tint)",
        },
        clinical: {
          DEFAULT: "var(--clinical)",
          deep: "var(--clinical-deep)",
          soft: "var(--clinical-soft)",
          faint: "var(--clinical-faint)",
          muted: "var(--clinical-muted)",
        },
        dark: {
          DEFAULT: "var(--dark)",
          raised: "var(--dark-raised)",
          rule: "var(--dark-rule)",
          ink: "var(--dark-ink)",
          "ink-muted": "var(--dark-ink-muted)",
        },
        ink: {
          DEFAULT: "var(--ink)",
          muted: "var(--ink-muted)",
          faint: "var(--ink-faint)",
          inverse: "var(--ink-inverse)",
        },
        canvas: "var(--canvas)",
        surface: {
          DEFAULT: "var(--surface)",
          sunken: "var(--surface-sunken)",
        },
        rule: {
          DEFAULT: "var(--rule)",
          strong: "var(--rule-strong)",
        },
        ok: { DEFAULT: "var(--ok)", wash: "var(--ok-wash)" },
        caution: { DEFAULT: "var(--caution)", wash: "var(--caution-wash)" },
        breach: { DEFAULT: "var(--breach)", wash: "var(--breach-wash)" },
        neutral: { DEFAULT: "var(--neutral)", wash: "var(--neutral-wash)" },
        info: { DEFAULT: "var(--info)", wash: "var(--info-wash)" },
        focus: "var(--focus)",
      },
      fontFamily: {
        ui: "var(--font-ui)",
        data: "var(--font-data)",
      },
      fontSize: {
        xs: "var(--text-xs)",
        sm: "var(--text-sm)",
        base: "var(--text-base)",
        lg: "var(--text-lg)",
        xl: "var(--text-xl)",
        "2xl": "var(--text-2xl)",
        kpi: "var(--text-kpi)",
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        lg: "var(--radius-lg)",
      },
      maxWidth: {
        content: "var(--content-max)",
        form: "720px",
      },
    },
  },
  plugins: [],
};
