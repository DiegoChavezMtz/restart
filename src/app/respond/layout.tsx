import type { ReactNode } from "react";
import { RequireAuth } from "@/presentation/state/RequireAuth";
import { ParticipantLayout } from "@/presentation/templates/ParticipantLayout";

export default function RespondSegmentLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <ParticipantLayout>{children}</ParticipantLayout>
    </RequireAuth>
  );
}
