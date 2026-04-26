import { AdminShell } from "@/components/admin/shell";
import { requireAdminSession } from "@/lib/admin/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdminSession();

  return (
    <AdminShell mode={session.mode} user={session.user}>
      {children}
    </AdminShell>
  );
}
