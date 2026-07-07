import type { ReactNode } from "react";
import { RequireAdmin } from "@/presentation/state/RequireAdmin";
import { AdminLayout } from "@/presentation/templates/AdminLayout";

export default function AdminSegmentLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAdmin>
      <AdminLayout>{children}</AdminLayout>
    </RequireAdmin>
  );
}
