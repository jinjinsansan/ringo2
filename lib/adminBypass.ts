const RAW_EMAILS = ["goldbenchan@gmail.com", "goldbenchan@gamil.com"];

const NORMALIZED_EMAILS = new Set(RAW_EMAILS.map((email) => email.toLowerCase()));

export function isAdminBypassEmail(email?: string | null) {
  if (!email) return false;
  return NORMALIZED_EMAILS.has(email.toLowerCase());
}
