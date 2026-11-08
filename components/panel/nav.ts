import { ROUTES } from "@/lib/constants/routes";
import {
  LayoutDashboard,
  Search,
  HardHat,
  Home,
  Plus,
  Rss,
  Upload,
  Users,
  Link2,
  Globe,
  Building2,
  CreditCard,
  KeyRound,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  exact?: boolean;
  /** Shown indented under the item above it (a shortcut). */
  sub?: boolean;
}

export interface NavGroup {
  titleKey: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    titleKey: "network",
    items: [
      {
        href: "/panel",
        labelKey: "dashboard",
        icon: LayoutDashboard,
        exact: true,
      },
      {
        href: "/panel/buscar",
        labelKey: "searchNetwork",
        icon: Search,
      },
      {
        href: "/panel/obra-nueva",
        labelKey: "newBuilds",
        icon: HardHat,
      },
    ],
  },

  {
    titleKey: "myAgency",
    items: [
      {
        href: "/panel/mis-propiedades",
        labelKey: "myProperties",
        icon: Home,
      },
      {
        href: ROUTES.newProperty,
        labelKey: "addProperty",
        icon: Plus,
        sub: true,
      },
      {
        href: ROUTES.addFeed,
        labelKey: "addXmlFeed",
        icon: Rss,
        sub: true,
      },
      {
        href: "/panel/exportar-xml",
        labelKey: "xmlExport",
        icon: Upload,
      },
      {
        href: "/panel/crm",
        labelKey: "contacts",
        icon: Users,
      },
      {
        href: "/panel/client-pages",
        labelKey: "clientPages",
        icon: Link2,
      },
    ],
  },

  {
    titleKey: "account",
    items: [
      {
        href: "/panel/mi-agencia",
        labelKey: "agencyDetails",
        icon: Building2,
      },
      {
        href: "/panel/security",
        labelKey: "security",
        icon: KeyRound,
      },
    ],
  },
];