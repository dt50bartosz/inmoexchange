export type Session = {
  id: string;
  browser: string;
  os: string;
  device: "desktop" | "mobile";
  location: string;
  lastActive: string; // ISO
  current: boolean;
};

export type SecurityEmails = { newDevice: boolean; passwordChanged: boolean; emailChanged: boolean };

export type SecurityState = {
  agencyName: string;
  loginEmail: string;
  pendingEmail: string | null;
  passwordChangedAt: string; // ISO
  sessions: Session[];
  emails: SecurityEmails;
};

export const PASSWORD_MIN = 10;
