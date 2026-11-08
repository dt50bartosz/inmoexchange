/** Admin routes in one place. */
export const ADMIN_ROUTES = {
  dashboard: "/admin",
  applications: "/admin/applications",
  agencies: "/admin/agencies",
  newAgency: "/admin/agencies/new",
  agency: (id: string) => `/admin/agencies/${id}`,
  properties: "/admin/properties",
  feeds: "/admin/feeds",
  blog: "/admin/blog",
  newBlogPost: "/admin/blog/new",
  blogPost: (id: string) => `/admin/blog/${id}`,
  security: "/admin/security",
  developers: "/admin/promotores",
  newDeveloper: "/admin/promotores/new",
  developer: (id: string, tab?: string) => `/admin/promotores/${id}${tab ? `?tab=${tab}` : ""}`,
  editDeveloper: (id: string) => `/admin/promotores/${id}/perfil`,
  developerRegistrations: (id: string, status?: string) => `/admin/promotores/${id}/registros${status ? `?estado=${status}` : ""}`,
  /** Choose (or create) the developer first, then the development form. */
  pickDeveloperForProject: "/admin/promotores/promociones/new",
  newProject: (developerId: string) => `/admin/promotores/${developerId}/promociones/new`,
  projects: "/admin/promotores/projects",
  project: (developerId: string, id: string) => `/admin/promotores/${developerId}/promociones/${id}`,
  editProject: (developerId: string, id: string) => `/admin/promotores/${developerId}/promociones/${id}/editar`,
  projectUnits: (developerId: string, id: string) => `/admin/promotores/${developerId}/promociones/${id}/unidades`,
} as const;

export const AGENCY_STATUSES = ["trial", "active", "suspended", "cancelled"] as const;
export type AgencyStatus = (typeof AGENCY_STATUSES)[number];

/** Statuses an admin can pick when adding an agency by hand. */
export const NEW_AGENCY_STATUSES = ["trial", "active"] as const;

export const APPLICATION_STATUSES = ["pending", "approved", "rejected"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const ADMIN_PAGE_SIZE = 15;

/** The feed import saves error codes on the feed; the admin pages show them in plain words. */
export const FEED_ERROR_TEXT: Record<string, string> = {
  unreachable: "Couldn't reach the feed URL.",
  not_kyero: "The URL isn't a Kyero feed.",
  blocked: "The address isn't allowed (private or local network).",
  too_large: "The feed is larger than 100 MB.",
  import_failed: "The import failed.",
};
