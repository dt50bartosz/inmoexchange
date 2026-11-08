/** Fake network delay for the front-end mock. Remove when the API is connected. */
export const wait = (ms = 700) => new Promise((r) => setTimeout(r, ms));

/** Focus the first invalid field after a failed submit. */
export const focusFirstInvalid = (root?: HTMLElement | null) =>
  setTimeout(() => (root ?? document).querySelector<HTMLElement>("[aria-invalid='true']")?.focus(), 0);
