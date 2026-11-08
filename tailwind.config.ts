import type { Config } from "tailwindcss";

/**
 * Tailwind v4 does not read this file (no @config in globals.css); components.json only points shadcn at it.
 * Colours, shadows and fonts live in app/globals.css (@theme inline + :root tokens).
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  plugins: [],
};
export default config;
