// lib/constants/legal-docs.ts
// Every legal document of the platform: where it lives, and the starting template for its first version.
// Templates contain STRUCTURE ONLY: every clause and company detail is a {{placeholder}} for a qualified legal
// professional to supply. Never write invented legal text, registration numbers or addresses here.

export const LEGAL_LANGS = ["es", "en", "pl"] as const;
export type LegalLang = (typeof LEGAL_LANGS)[number];

export const LEGAL_DOC_KEYS = [
  "terms",
  "privacy",
  "cookies",
  "legal_notice",
  "data_protection",
  "agency_terms",
  "developer_terms",
  "mls_agreement",
  "data_sharing",
  "listing_accuracy",
] as const;
export type LegalDocKey = (typeof LEGAL_DOC_KEYS)[number];

type DocMeta = {
  /** Public address (no locale prefix). */
  path: string;
  /** Admin label (admin is English-only). */
  label: string;
  /** Shown in the public footers. */
  footer: boolean;
  /** Who must accept it (phase 3: registration). */
  audience: "everyone" | "agency" | "developer" | "agency_developer";
  /** The page has a built-in text (messages legal.*) used until a version is published in the admin. */
  builtIn: boolean;
};

export const LEGAL_DOCS: Record<LegalDocKey, DocMeta> = {
  terms: { path: "/terminos", label: "Terms and Conditions", footer: true, audience: "everyone", builtIn: true },
  privacy: { path: "/privacidad", label: "Privacy Policy", footer: true, audience: "everyone", builtIn: true },
  cookies: { path: "/cookies", label: "Cookie Policy", footer: true, audience: "everyone", builtIn: true },
  legal_notice: { path: "/aviso-legal", label: "Legal Notice (Aviso Legal)", footer: true, audience: "everyone", builtIn: true },
  data_protection: { path: "/legal/proteccion-de-datos", label: "Data Protection Information", footer: true, audience: "everyone", builtIn: false },
  agency_terms: { path: "/legal/condiciones-agencias", label: "Agency Terms of Use", footer: true, audience: "agency", builtIn: false },
  developer_terms: { path: "/legal/condiciones-promotores", label: "Developer Terms of Use", footer: true, audience: "developer", builtIn: false },
  mls_agreement: { path: "/legal/acuerdo-mls", label: "MLS Participation Agreement", footer: false, audience: "agency_developer", builtIn: false },
  data_sharing: { path: "/legal/acuerdo-intercambio-datos", label: "Data Sharing Agreement", footer: false, audience: "agency", builtIn: false },
  listing_accuracy: { path: "/legal/exactitud-de-datos", label: "Property Listing and Data Accuracy Agreement", footer: false, audience: "developer", builtIn: false },
};

/** /legal/<slug> → key (the documents without a page of their own). */
export const LEGAL_SLUGS: Record<string, LegalDocKey> = Object.fromEntries(
  LEGAL_DOC_KEYS.filter((k) => LEGAL_DOCS[k].path.startsWith("/legal/")).map((k) => [LEGAL_DOCS[k].path.slice("/legal/".length), k])
);

/** {{…}} in a document: information a legal professional must still supply. */
export const PLACEHOLDER_RE = /\{\{\s*([^{}]+?)\s*\}\}/g;
export const hasPlaceholders = (html: string) => new RegExp(PLACEHOLDER_RE.source).test(html);

/* ---------- Starting templates (structure + placeholders only) ---------- */

const TITLES: Record<LegalDocKey, Record<LegalLang, string>> = {
  terms: { es: "Términos y condiciones", en: "Terms and Conditions", pl: "Regulamin" },
  privacy: { es: "Política de privacidad", en: "Privacy Policy", pl: "Polityka prywatności" },
  cookies: { es: "Política de cookies", en: "Cookie Policy", pl: "Polityka plików cookie" },
  legal_notice: { es: "Aviso legal", en: "Legal Notice", pl: "Nota prawna" },
  data_protection: { es: "Información sobre protección de datos", en: "Data Protection Information", pl: "Informacja o ochronie danych" },
  agency_terms: { es: "Condiciones de uso para agencias", en: "Agency Terms of Use", pl: "Warunki korzystania dla agencji" },
  developer_terms: { es: "Condiciones de uso para promotores", en: "Developer Terms of Use", pl: "Warunki korzystania dla deweloperów" },
  mls_agreement: { es: "Acuerdo de participación en el MLS", en: "MLS Participation Agreement", pl: "Umowa uczestnictwa w MLS" },
  data_sharing: { es: "Acuerdo de intercambio de datos", en: "Data Sharing Agreement", pl: "Umowa o udostępnianiu danych" },
  listing_accuracy: { es: "Acuerdo de exactitud de anuncios y datos", en: "Property Listing and Data Accuracy Agreement", pl: "Umowa o rzetelności ogłoszeń i danych" },
};

const NOTE: Record<LegalLang, string> = {
  es: "Borrador: todo el texto entre llaves dobles debe redactarlo y revisarlo un profesional jurídico cualificado antes de publicar.",
  en: "Draft: all text in double braces must be written and reviewed by a qualified legal professional before publishing.",
  pl: "Szkic: cały tekst w podwójnych nawiasach klamrowych musi zostać napisany i sprawdzony przez wykwalifikowanego prawnika przed publikacją.",
};

/** Section headings per document (no clauses). */
const SECTIONS: Record<LegalDocKey, Record<LegalLang, string[]>> = {
  terms: {
    es: ["Identificación del prestador", "Objeto", "Registro y cuentas", "Uso del servicio", "Responsabilidad", "Duración y baja", "Ley aplicable y jurisdicción"],
    en: ["Provider details", "Purpose", "Registration and accounts", "Use of the service", "Liability", "Term and termination", "Governing law and jurisdiction"],
    pl: ["Dane usługodawcy", "Przedmiot", "Rejestracja i konta", "Korzystanie z usługi", "Odpowiedzialność", "Czas trwania i rezygnacja", "Prawo właściwe i jurysdykcja"],
  },
  privacy: {
    es: ["Responsable del tratamiento", "Datos que tratamos", "Finalidades y base jurídica", "Destinatarios", "Conservación", "Derechos", "Reclamaciones"],
    en: ["Data controller", "Data we process", "Purposes and legal basis", "Recipients", "Retention", "Your rights", "Complaints"],
    pl: ["Administrator danych", "Przetwarzane dane", "Cele i podstawa prawna", "Odbiorcy", "Okres przechowywania", "Twoje prawa", "Skargi"],
  },
  cookies: {
    es: ["Qué son las cookies", "Cookies que usamos", "Base jurídica", "Cómo gestionar tu consentimiento"],
    en: ["What cookies are", "Cookies we use", "Legal basis", "How to manage your consent"],
    pl: ["Czym są pliki cookie", "Używane pliki cookie", "Podstawa prawna", "Jak zarządzać zgodą"],
  },
  legal_notice: {
    es: ["Datos identificativos (LSSI art. 10)", "Condiciones de uso del sitio", "Propiedad intelectual", "Responsabilidad", "Ley aplicable"],
    en: ["Company details (LSSI art. 10)", "Website terms of use", "Intellectual property", "Liability", "Governing law"],
    pl: ["Dane identyfikacyjne (LSSI art. 10)", "Warunki korzystania ze strony", "Własność intelektualna", "Odpowiedzialność", "Prawo właściwe"],
  },
  data_protection: {
    es: ["Responsable", "Delegado de protección de datos", "Finalidades", "Legitimación", "Destinatarios y transferencias", "Derechos y cómo ejercerlos", "Autoridad de control"],
    en: ["Controller", "Data protection officer", "Purposes", "Legal basis", "Recipients and transfers", "Rights and how to exercise them", "Supervisory authority"],
    pl: ["Administrator", "Inspektor ochrony danych", "Cele", "Podstawa prawna", "Odbiorcy i przekazywanie", "Prawa i ich realizacja", "Organ nadzorczy"],
  },
  agency_terms: {
    es: ["Ámbito", "Obligaciones de la agencia", "Uso de los datos de la red", "Colaboraciones y honorarios", "Suspensión y baja"],
    en: ["Scope", "Agency obligations", "Use of network data", "Collaborations and fees", "Suspension and termination"],
    pl: ["Zakres", "Obowiązki agencji", "Korzystanie z danych sieci", "Współpraca i prowizje", "Zawieszenie i rezygnacja"],
  },
  developer_terms: {
    es: ["Ámbito", "Obligaciones del promotor", "Promociones y unidades", "Registro de clientes de agencias", "Suspensión y baja"],
    en: ["Scope", "Developer obligations", "Developments and units", "Agency client registrations", "Suspension and termination"],
    pl: ["Zakres", "Obowiązki dewelopera", "Inwestycje i lokale", "Rejestracja klientów agencji", "Zawieszenie i rezygnacja"],
  },
  mls_agreement: {
    es: ["Partes", "Objeto del MLS", "Normas de colaboración", "Reparto de honorarios", "Incumplimientos", "Duración"],
    en: ["Parties", "Purpose of the MLS", "Collaboration rules", "Fee sharing", "Breaches", "Term"],
    pl: ["Strony", "Cel MLS", "Zasady współpracy", "Podział prowizji", "Naruszenia", "Czas trwania"],
  },
  data_sharing: {
    es: ["Partes y roles (responsable / encargado)", "Datos compartidos", "Finalidad", "Medidas de seguridad", "Duración y devolución de datos"],
    en: ["Parties and roles (controller / processor)", "Data shared", "Purpose", "Security measures", "Term and return of data"],
    pl: ["Strony i role (administrator / podmiot przetwarzający)", "Udostępniane dane", "Cel", "Środki bezpieczeństwa", "Czas trwania i zwrot danych"],
  },
  listing_accuracy: {
    es: ["Exactitud de la información publicada", "Precios y disponibilidad", "Planos, memorias y material comercial", "Actualizaciones", "Responsabilidad"],
    en: ["Accuracy of published information", "Prices and availability", "Floor plans, specifications and marketing material", "Updates", "Liability"],
    pl: ["Rzetelność publikowanych informacji", "Ceny i dostępność", "Rzuty, specyfikacje i materiały marketingowe", "Aktualizacje", "Odpowiedzialność"],
  },
};

const PH: Record<LegalLang, (section: string) => string> = {
  es: (s) => `{{Texto de la sección «${s}» pendiente de redactar por un profesional jurídico}}`,
  en: (s) => `{{Text of the “${s}” section to be written by a legal professional}}`,
  pl: (s) => `{{Treść sekcji „${s}” do przygotowania przez prawnika}}`,
};

/** First draft of a document: title + one heading per section, each with a placeholder. */
export function legalTemplate(key: LegalDocKey): { title: Record<LegalLang, string>; content: Record<LegalLang, string> } {
  const content = Object.fromEntries(
    LEGAL_LANGS.map((l) => [l, `<p><em>${NOTE[l]}</em></p>` + SECTIONS[key][l].map((s) => `<h2>${s}</h2><p>${PH[l](s)}</p>`).join("")])
  ) as Record<LegalLang, string>;
  return { title: { ...TITLES[key] }, content };
}

export const legalTitle = (key: LegalDocKey, lang: LegalLang) => TITLES[key][lang];
