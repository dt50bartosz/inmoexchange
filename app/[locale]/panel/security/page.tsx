// app/[locale]/panel/security/page.tsx
import SecurityPage from "@/components/security/SecurityPage";
import { getCurrentAgency } from "@/lib/server/current-agency";
import { sessionUser, toSecurityInfo } from "@/lib/server/account";
import {
  cancelEmailChangeAction,
  changePasswordAction,
  requestEmailChangeAction,
  resendEmailChangeAction,
  signOutEverywhereAction,
} from "./server/actions";

export const dynamic = "force-dynamic";

export default async function Page() {
  await getCurrentAgency(); // logged-in agency with a current session
  const user = await sessionUser();
  if (!user) return null; // not reachable: getCurrentAgency() redirects first
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
