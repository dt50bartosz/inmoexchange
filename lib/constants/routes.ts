/** Public property pages (no login): /listings and /listings/<code>. */
export const LISTINGS_ROUTE = "/listings";

/** Panel routes in one place. Change a slug here and every link follows. */
export const ROUTES = {
  dashboard: "/panel",
  properties: "/panel/mis-propiedades",
  newProperty: "/panel/mis-propiedades/new",
  editProperty: (id: string) => `/panel/mis-propiedades/${id}/edit`,
  /** Mis propiedades, opened on the import feeds tab. */
  propertyFeeds: "/panel/mis-propiedades?tab=feeds",
  /** The feeds tab with the "Add XML feed" dialog already open (sidebar). */
  addFeed: "/panel/mis-propiedades?tab=feeds&add=1",
  search: "/panel/buscar",
  searchProperty: (id: string) => `/panel/buscar/${id}`,
  xmlExports: "/panel/exportar-xml",
  newXmlExport: "/panel/exportar-xml/new",
  editXmlExport: (id: string) => `/panel/exportar-xml/${id}/edit`,
} as const;

/** Developer panel routes (role "developer"). */
export const PROMOTOR_ROUTES = {
  home: "/promotor",
  profile: "/promotor/perfil",
  developments: "/promotor/promociones",
  newDevelopment: "/promotor/promociones/new",
  development: (id: string) => `/promotor/promociones/${id}`,
  registrations: "/promotor/registros",
} as const;
