import type { Metadata } from "next";
import { AdminModeDesk } from "@/components/app/admin-mode-desk";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AdminModePage() {
  return (
    <div className="app-shell min-h-svh px-4 py-8 sm:px-6">
      <AdminModeDesk />
    </div>
  );
}
