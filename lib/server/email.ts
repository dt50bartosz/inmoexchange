// lib/server/email.ts
// Sends emails over SMTP (nodemailer), plus the emails the platform sends.
// Env: SMTP_HOST, SMTP_PORT (465 = SSL), SMTP_USER, SMTP_PASS; optional EMAIL_FROM (defaults to SMTP_USER —
// Gmail only sends "from" the account itself); NEXT_PUBLIC_BASE_URL (links in the emails).
import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

export type EmailResult = "sent" | "failed" | "not_configured";

type Email = { to: string; subject: string; text: string; html: string };

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  const port = Number(SMTP_PORT) || 465;
  transporter ??= nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465, // 465 = SSL; 587 upgrades with STARTTLS
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

/** Never throws: the caller decides what to tell the admin. Without SMTP settings nothing is sent. */
export async function sendEmail(email: Email): Promise<EmailResult> {
  const smtp = getTransporter();
  if (!smtp) {
    console.warn(`[email] SMTP_HOST / SMTP_USER / SMTP_PASS not set; not sent: "${email.subject}" to ${email.to}`);
    return "not_configured";
  }
  try {
    await smtp.sendMail({
      from: process.env.EMAIL_FROM || `"Colabora MLS" <${process.env.SMTP_USER}>`,
      to: email.to,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });
    return "sent";
  } catch (err) {
    console.error("[email] SMTP send failed", err);
    return "failed";
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const baseUrl = () => (process.env.NEXT_PUBLIC_BASE_URL ?? "").replace(/\/+$/, "");

/* ---------- Every email is sent in Spanish and English: Spanish first, then the same in English ---------- */

/** One language's half of an email. */
type Part = {
  lines: string[];
  /** Label/value rows, e.g. login + temporary password. */
  rows?: [string, string][];
  button?: string;
  footer: string;
};

const BTN = "display:inline-block;margin-top:8px;padding:10px 16px;background:#0c4a6e;color:#fff;border-radius:6px;text-decoration:none";

function partHtml(p: Part, url?: string) {
  const rows = p.rows?.length
    ? `<table style="border-collapse:collapse">${p.rows
        .map(([k, v]) => `<tr><td style="padding:2px 12px 2px 0;color:#475569">${esc(k)}</td><td><strong style="font-family:ui-monospace,monospace;font-size:15px">${esc(v)}</strong></td></tr>`)
        .join("")}</table>`
    : "";
  return [
    ...p.lines.map((l) => `<p>${esc(l)}</p>`),
    rows,
    p.button && url ? `<p><a href="${esc(url)}" style="${BTN}">${esc(p.button)}</a></p>` : "",
    `<p style="color:#94a3b8;font-size:13px">${esc(p.footer)}</p>`,
  ].join("\n");
}

function partText(p: Part, url?: string) {
  return [...p.lines, ...(p.rows ?? []).map(([k, v]) => `${k}: ${v}`), ...(p.button && url ? ["", `${p.button}: ${url}`] : []), "", p.footer].join("\n");
}

/** Builds an email with the Spanish and English versions one after the other (Spanish first: main language). */
function bilingual(p: { to: string; subject: { en: string; es: string }; url?: string; en: Part; es: Part }): Email {
  // Logo at the top: email apps load it from the site, so only when the site address is configured
  const logo = baseUrl()
    ? `<p style="margin:0 0 20px"><img src="${esc(`${baseUrl()}/brand/logo.png`)}" alt="Colabora MLS" width="180" height="49" style="display:block;border:0;height:auto"></p>\n`
    : "";
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#0f172a">
${logo}<div lang="es">${partHtml(p.es, p.url)}</div>
<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
<div lang="en">${partHtml(p.en, p.url)}</div></div>`;
  const text = `${partText(p.es, p.url)}\n\n----------\n\n${partText(p.en, p.url)}`;
  return { to: p.to, subject: `${p.subject.es} / ${p.subject.en}`, text, html };
}

const IGNORE = { en: "If you didn't ask for this, you can ignore this email.", es: "Si no lo has solicitado tú, puedes ignorar este correo." };
const SECURITY = { en: "This is a security notice from Colabora MLS.", es: "Este es un aviso de seguridad de Colabora MLS." };
const TEAM = { en: "This is a notice from the Colabora MLS team.", es: "Este es un aviso del equipo de Colabora MLS." };

/** Login details for a new agency (or new ones the admin sent again). */
export const loginDetailsEmail = (p: { to: string; agencyName: string; password: string }) =>
  bilingual({
    to: p.to,
    subject: { en: "Your Colabora MLS login", es: "Tus datos de acceso a Colabora MLS" },
    url: `${baseUrl()}/login`,
    en: {
      lines: [`Welcome to Colabora MLS, ${p.agencyName}!`, "Your login details:"],
      rows: [["Login", p.to], ["Temporary password", p.password]],
      button: "Log in",
      footer: "You'll be asked to choose your own password when you first log in. If you didn't expect this email, you can ignore it.",
    },
    es: {
      lines: [`¡Bienvenidos a Colabora MLS, ${p.agencyName}!`, "Tus datos de acceso:"],
      rows: [["Usuario", p.to], ["Contraseña temporal", p.password]],
      button: "Iniciar sesión",
      footer: "Al entrar por primera vez tendrás que elegir tu propia contraseña. Si no esperabas este correo, puedes ignorarlo.",
    },
  });

/** "Forgot password": a link that sets a new password (valid 1 hour, works once). */
export const passwordResetEmail = (to: string, token: string) =>
  bilingual({
    to,
    subject: { en: "Reset your Colabora MLS password", es: "Restablece tu contraseña de Colabora MLS" },
    url: `${baseUrl()}/reset-password/${token}`,
    en: {
      lines: ["Someone asked to reset the password for this Colabora MLS login.", "The link works once and expires in 1 hour. Your current password keeps working until you use it."],
      button: "Choose a new password",
      footer: IGNORE.en,
    },
    es: {
      lines: ["Se ha solicitado restablecer la contraseña de este acceso a Colabora MLS.", "El enlace solo funciona una vez y caduca en 1 hora. Tu contraseña actual sigue funcionando hasta que lo uses."],
      button: "Elegir una nueva contraseña",
      footer: IGNORE.es,
    },
  });

/** Sent to the NEW address: the login email only changes once this link is used. */
export const emailChangeEmail = (to: string, token: string) =>
  bilingual({
    to,
    subject: { en: "Confirm your new Colabora MLS login email", es: "Confirma tu nuevo correo de acceso a Colabora MLS" },
    url: `${baseUrl()}/confirm-email/${token}`,
    en: { lines: [`Confirm that ${to} should become your Colabora MLS login email.`, "The link expires in 24 hours."], button: "Confirm new email", footer: IGNORE.en },
    es: { lines: [`Confirma que ${to} será tu nuevo correo de acceso a Colabora MLS.`, "El enlace caduca en 24 horas."], button: "Confirmar nuevo correo", footer: IGNORE.es },
  });

/** Sent to the OLD address, so a stolen session can't quietly take over the login. */
export const emailChangeNoticeEmail = (to: string, newEmail: string) =>
  bilingual({
    to,
    subject: { en: "Your Colabora MLS login email is being changed", es: "Se está cambiando tu correo de acceso a Colabora MLS" },
    en: {
      lines: [`Someone asked to change your Colabora MLS login email to ${newEmail}.`, "Nothing changes until that address confirms it. If this wasn't you, log in, cancel the change and change your password."],
      footer: SECURITY.en,
    },
    es: {
      lines: [`Se ha solicitado cambiar tu correo de acceso a Colabora MLS por ${newEmail}.`, "No cambia nada hasta que esa dirección lo confirme. Si no has sido tú, entra, cancela el cambio y cambia tu contraseña."],
      footer: SECURITY.es,
    },
  });

/** After a password change or reset. */
export const passwordChangedEmail = (to: string) =>
  bilingual({
    to,
    subject: { en: "Your Colabora MLS password was changed", es: "Se ha cambiado tu contraseña de Colabora MLS" },
    url: `${baseUrl()}/login`,
    en: {
      lines: ["The password for this Colabora MLS login was just changed, and other devices were signed out.", "If this wasn't you, use “Forgot password” on the login page straight away."],
      button: "Log in",
      footer: SECURITY.en,
    },
    es: {
      lines: ["Se acaba de cambiar la contraseña de este acceso a Colabora MLS y se ha cerrado la sesión en los demás dispositivos.", "Si no has sido tú, usa “¿Has olvidado tu contraseña?” en la página de acceso inmediatamente."],
      button: "Iniciar sesión",
      footer: SECURITY.es,
    },
  });

/** To the agency: a client asked to see a property on their client page. */
export const viewingRequestEmail = (p: { to: string; buyerName: string; propertyTitle: string; editorUrl: string; comment: string }) =>
  bilingual({
    to: p.to,
    subject: { en: `${p.buyerName} wants to see a property`, es: `${p.buyerName} quiere ver un inmueble` },
    url: `${baseUrl()}${p.editorUrl}`,
    en: {
      lines: [`${p.buyerName} asked for a viewing of ${p.propertyTitle} on their client page.`, ...(p.comment ? [`Their note: “${p.comment}”`] : [])],
      button: "Open the client page",
      footer: "Sent by Colabora MLS because a client used the page you shared with them.",
    },
    es: {
      lines: [`${p.buyerName} ha pedido una visita de ${p.propertyTitle} desde su página de cliente.`, ...(p.comment ? [`Su nota: “${p.comment}”`] : [])],
      button: "Abrir la página del cliente",
      footer: "Enviado por Colabora MLS porque un cliente usó la página que le compartiste.",
    },
  });

/** To the applicant: their /join request was declined. */
export const applicationRejectedEmail = (p: { to: string; agencyName: string; reason: string }) =>
  bilingual({
    to: p.to,
    subject: { en: "Your Colabora MLS application", es: "Tu solicitud a Colabora MLS" },
    en: {
      lines: [
        `Thank you for applying to join Colabora MLS with ${p.agencyName}.`,
        "We're not able to accept the application at the moment.",
        ...(p.reason ? [`Reason: ${p.reason}`] : []),
        "You're welcome to apply again later or reply to this email if you have questions.",
      ],
      footer: "Sent by Colabora MLS about the application you made on our website.",
    },
    es: {
      lines: [
        `Gracias por solicitar unirte a Colabora MLS con ${p.agencyName}.`,
        "Por el momento no podemos aceptar la solicitud.",
        ...(p.reason ? [`Motivo: ${p.reason}`] : []),
        "Puedes volver a solicitarlo más adelante o responder a este correo si tienes preguntas.",
      ],
      footer: "Enviado por Colabora MLS sobre la solicitud que hiciste en nuestra web.",
    },
  });

/** To the agency: the admin took one of its properties off the network. */
export const propertyHiddenEmail = (p: { to: string; reference: string; title: string; reason: string }) =>
  bilingual({
    to: p.to,
    subject: { en: `Property ${p.reference} was taken off the network`, es: `El inmueble ${p.reference} se ha retirado de la red` },
    url: `${baseUrl()}/panel/mis-propiedades`,
    en: {
      lines: [
        `Your property ${p.title} (ref ${p.reference}) has been hidden from the Colabora MLS network by our team.`,
        `Reason: ${p.reason}`,
        "Partner agencies, XML exports and client pages no longer show it. Fix the issue in your panel and reply to this email, and we'll check it again.",
      ],
      button: "Open my properties",
      footer: TEAM.en,
    },
    es: {
      lines: [
        `Nuestro equipo ha ocultado tu inmueble ${p.title} (ref. ${p.reference}) de la red de Colabora MLS.`,
        `Motivo: ${p.reason}`,
        "Ya no lo ven las agencias colaboradoras, las exportaciones XML ni las páginas de clientes. Corrige el problema en tu panel y responde a este correo para que lo revisemos de nuevo.",
      ],
      button: "Abrir mis inmuebles",
      footer: TEAM.es,
    },
  });

/** To the agency: the property is visible again. */
export const propertyRestoredEmail = (p: { to: string; reference: string; title: string }) =>
  bilingual({
    to: p.to,
    subject: { en: `Property ${p.reference} is back on the network`, es: `El inmueble ${p.reference} vuelve a estar en la red` },
    en: { lines: [`Your property ${p.title} (ref ${p.reference}) is visible on the Colabora MLS network again.`], footer: TEAM.en },
    es: { lines: [`Tu inmueble ${p.title} (ref. ${p.reference}) vuelve a ser visible en la red de Colabora MLS.`], footer: TEAM.es },
  });

/** To the admins: a new /join request is waiting. */
export const newApplicationEmail = (p: {
  to: string;
  agencyName: string;
  contactPerson: string;
  email: string;
  town: string;
  /** "developer" for /promotoras applications; agency when missing. */
  kind?: "agency" | "developer";
}) => {
  const dev = p.kind === "developer";
  const where = p.town ? ` (${p.town})` : "";
  return bilingual({
    to: p.to,
    subject: dev
      ? { en: `New developer application: ${p.agencyName}`, es: `Nueva solicitud de promotora: ${p.agencyName}` }
      : { en: `New agency application: ${p.agencyName}`, es: `Nueva solicitud de agencia: ${p.agencyName}` },
    url: `${baseUrl()}/admin/applications`,
    en: {
      lines: [`${p.agencyName}${where} applied to join Colabora MLS${dev ? " as a developer" : ""}.`, `Contact: ${p.contactPerson}, ${p.email}`],
      button: "Review applications",
      footer: "Sent to Colabora MLS admins.",
    },
    es: {
      lines: [`${p.agencyName}${where} ha solicitado unirse a Colabora MLS${dev ? " como promotora" : ""}.`, `Contacto: ${p.contactPerson}, ${p.email}`],
      button: "Revisar solicitudes",
      footer: "Enviado a los administradores de Colabora MLS.",
    },
  });
};
