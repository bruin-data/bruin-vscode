const animate = require("tailwindcss-animate");
import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  safelist: ["dark"],
  prefix: "",

  content: ["./index.html", "./src/components/**/*.{ts,tsx,vue}", "./src/**/*.{ts,tsx,vue}"],

  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    screens: {
      "xs": "480px",
      "2xs": "320px",
      "3xs": "240px",
    },
    extend: {
      typography: (theme) => ({
        DEFAULT: {
          css: {
            color: theme("colors.editor-fg"),
            h1: {
              color: theme("colors.editor-fg"),
            },
            h2: {
              color: theme("colors.editor-fg"),
            },
            h3: {
              color: theme("colors.editor-fg"),
            },
            h4: {
              color: theme("colors.editor-fg"),
            },
            h5: {
              color: theme("colors.editor-fg"),
            },
            h6: {
              color: theme("colors.editor-fg"),
            },
            a: {
              "color": theme("colors.link-activeForeground"),
              "&:hover": {
                color: theme("colors.link-activeForeground"),
              },
            },
            strong: {
              color: theme("colors.editor-fg"),
            },
            blockquote: {
              color: theme("colors.editor-fg"),
            },
            code: {
              color: theme("colors.editor-bg"),
              backgroundColor: theme("colors.editor-fg"),
            },
          },
        },
      }),
      fontSize: {
        "2xs": ["0.75rem", { lineHeight: "1rem" }],
        "3xs": ["0.7rem", { lineHeight: "1rem" }],
      },
      colors: {
        "border": "hsl(var(--border))",
        "input": "hsl(var(--input))",
        "ring": "hsl(var(--ring))",
        "background": "hsl(var(--background))",
        "foreground": "hsl(var(--foreground))",
        "editor-bg": "var(--vscode-editor-background)",
        "editor-fg": "var(--vscode-editor-foreground)",
        "editor-border": "var(--vscode-editor-border)",
        "editor-button-bg": "var(--vscode-button-background)",
        "editor-button-hover-bg": "var(--vscode-button-hoverBackground)",
        "editor-button-fg": "var(--vscode-button-foreground)",
        "errorForeground": "var(--vscode-errorForeground)",
        "editorError-foreground"	: "var(--vscode-editorError-foreground)",
        "editor-button-border": "var(--vscode-button-border)",
        "textLink-activeForeground": "var(--vscode-textLink-activeForeground)",
        "editorLink-activeForeground"	: "var(--vscode-editorLink-activeForeground)",
        "menu-hoverBackground": "var(--vscode-scrollbarSlider-hoverBackground)",
        "progressBar-bg": "var(--vscode-progressBar-background)",
        "editorError-foreground": "var(--vscode-editorError-foreground)",
        "input-background": "var(--vscode-input-background)",
        "input-foreground": "var(--vscode-input-foreground)",
        "input-border": "var(--vscode-input-border)",
        "inputOption-activeBorder": "var(--vscode-inputOption-activeBorder)",
        "inputOption-hoverBackground": "var(--vscode-inputOption-hoverBackground)",
        "inputOption-activeBackground": "var(--vscode-inputOption-activeBackground)",
        "inputOption-activeForeground": "var(--vscode-inputOption-activeForeground)",
        "input-placeholderForeground": "var(--vscode-input-placeholderForeground)",
        "inputValidation-infoBackground": "var(--vscode-inputValidation-infoBackground)",
        "inputValidation-infoBorder": "var(--vscode-inputValidation-infoBorder)",
        "inputValidation-warningBackground": "var(--vscode-inputValidation-warningBackground)",
        "inputValidation-warningBorder": "var(--vscode-inputValidation-warningBorder)",
        "inputValidation-errorBackground": "var(--vscode-inputValidation-errorBackground)",
        "inputPlaceholderForeground": "var(--vscode-input-placeholderForeground)",
        "inputValidation-errorBorder": "var(--vscode-inputValidation-errorBorder)",
        "editorWidget-bg": "var(--vscode-editorWidget-background)",
        "editorLink-activeFg": "var(--vscode-editorLink-activeForeground)",
        "commandCenter-border": "var(--vscode-commandCenter-border)",
        "commandCenter-fg":"var(--vscode-commandCenter-foreground)",
        "commandCenter-bg":"var(--vscode-commandCenter-background)",
        "icon-forground": "var(--vscode-icon-foreground)",
        "dropdown-bg": "var(--vscode-dropdown-background)",
        "notificationCenter-border": "var(--vscode-notificationCenter-border)",
        "badge-bg": "var(--vscode-badge-background)",
        "panel-border": "var(--vscode-panel-border)",
        "sideBarSectionHeader-bg": "var(--vscode-sideBarSectionHeader-background)",
        "keybindingLabel-background": "var(--vscode-keybindingLabel-background)",
        "keybindingLabel-bottom-border": "var(--vscode-keybindingLabel-bottomBorder)",
        "notification-bg": "var(--vscode-notification-background)",
        "notification-fg": "var(--vscode-notification-foreground)",
        "notificationsInfoIcon-fg": "var(--vscode-notificationsInfoIcon-foreground)",
        "notificationsWarningIcon-fg": "var(--vscode-notificationsWarningIcon-foreground)",

        "primary": {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        "secondary": {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        "destructive": {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        "muted": {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        "accent": {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        "popover": {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        "card": {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "collapsible-down": {
          from: { height: 0 },
          to: { height: "var(--radix-collapsible-content-height)" },
        },
        "collapsible-up": {
          from: { height: "var(--radix-collapsible-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "collapsible-down": "collapsible-down 0.2s ease-in-out",
        "collapsible-up": "collapsible-up 0.2s ease-in-out",
      },
      gridTemplateColumns: {
        '16': 'repeat(16, minmax(0, 1fr))',
        '24': 'repeat(24, minmax(0, 1fr))',
        '21': 'repeat(21, minmax(0, 1fr))',
      },
    },
  },
  plugins: [typography, animate, require("@tailwindcss/forms")],
};
