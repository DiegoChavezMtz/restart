import type { ReactNode } from "react";
import { RequirePsychology } from "@/presentation/state/RequirePsychology";

export default function PsychologyLayout({ children }: { children: ReactNode }) { return <RequirePsychology>{children}</RequirePsychology>; }
