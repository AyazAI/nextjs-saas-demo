import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { loadContext } from "@/lib/context";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const context = await loadContext();
  if (!context.session?.user?.id) redirect("/login");
  if (!context.membership) return <>{children}</>;
  return <Shell context={{ ...context, membership: context.membership }}>{children}</Shell>;
}
