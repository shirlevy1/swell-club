import { redirect } from "next/navigation";
import { getViewer } from "@/lib/data";
import { demoMode } from "@/lib/config";
import { AppNav } from "@/components/app-nav";
import { AppHeader } from "@/components/app-header";
import { DemoBadge } from "@/components/demo-badge";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  return (
    <div className="relative isolate flex flex-1 flex-col">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(180deg, #ffffff 0%, #f2f7fa 55%, #e8f0f6 100%)",
        }}
      />

      {demoMode && <DemoBadge currentRole={viewer.role ?? "member"} />}

      <AppHeader />

      <main className="mx-auto w-full max-w-md flex-1 px-5 pb-28 pt-6">
        {children}
      </main>

      <AppNav isOrganizer={viewer.role === "organizer"} />
    </div>
  );
}
