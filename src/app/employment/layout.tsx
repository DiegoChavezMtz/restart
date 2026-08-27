import type { ReactNode } from "react";
import { RequireAuth } from "@/presentation/state/RequireAuth";
import { RequireCompleteEmploymentProfile } from "@/presentation/state/RequireCompleteEmploymentProfile";
import { ParticipantLayout } from "@/presentation/templates/ParticipantLayout";
import { EmploymentNav } from "@/presentation/molecules/EmploymentNav";

export default function EmploymentSegmentLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <ParticipantLayout>
        <RequireCompleteEmploymentProfile>
          <EmploymentNav />
          {children}
        </RequireCompleteEmploymentProfile>
      </ParticipantLayout>
    </RequireAuth>
  );
}
