// app/[locale]/admin/security/page.tsx
import SecurityPage from "@/components/security/SecurityPage";
import { requireAdmin } from "@/lib/server/admin/current-admin";
import { sessionUser, toSecurityInfo } from "@/lib/server/account";
import {
  cancelEmailChangeAction,
  changePasswordAction,
  requestEmailChangeAction,
  resendEmailChangeAction,
  signOutEverywhereAction,
} from "./server/actions";

export const dynamic = "force-dynamic";

/** The admin's own login: password, login email, sessions. */
export default async function Page() {
  await requireAdmin();
  const user = await sessionUser();
  if (!user) return null; // not reachable: requireAdmin() redirects first
  return (
    <SecurityPage
      info={toSecurityInfo(user)}
      actions={{
        changePassword: changePasswordAction,
        requestEmailChange: requestEmailChangeAction,
        resendEmailChange: resendEmailChangeAction,
        cancelEmailChange: cancelEmailChangeAction,
        signOutEverywhere: signOutEverywhereAction,
      }}
    />
  );
}
