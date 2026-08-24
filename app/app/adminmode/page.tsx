import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function AppAdminModeRedirect() {
  const host = (await headers()).get("host")?.split(":")[0] ?? "";
  if (
    host === "app.utopiadata.net" ||
    host.startsWith("app.localhost") ||
    host === "localhost" ||
    host === "127.0.0.1"
  ) {
    redirect("/adminmode");
  }
  redirect("https://app.utopiadata.net/adminmode");
}
