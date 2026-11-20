import { createFileRoute } from "@tanstack/react-router";
import AdminDashboard from "@/components/AdminDashboard";

export const Route = createFileRoute("/_admin/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "LuxeCard Studio — Manage your identity" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Manage your LuxeCard profile, contact details and social connections." },
      { property: "og:title", content: "LuxeCard Studio — Manage your identity" },
      { property: "og:description", content: "Edit your digital contact card." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminDashboard,
});
