// app/[locale]/panel/layout.jsx
import Footer from "@/components/Footer";
import AgencyProvider from "@/components/panel/AgencyProvider";
import PanelShell from "@/components/panel/PanelShell";
import { getCurrentAgency } from "@/lib/server/current-agency";

export const metadata = {
  title: { template: "%s | Panel Colabora MLS", default: "Panel Colabora MLS" },
  robots: { index: false, follow: false },
};

// Sidebar (a slide-out menu on phones), top bar with language and log out, then the page and the site footer
export default async function PanelLayout({ children }) {
  const agency = await getCurrentAgency();

  return (
    <AgencyProvider agency={agency}>
      <PanelShell footer={<Footer />}>{children}</PanelShell>
    </AgencyProvider>
  );
}
