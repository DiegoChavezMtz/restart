import { notFound } from "next/navigation";

// Las insignias están en desarrollo y por ahora solo se administran desde /admin/badges.
export default function BadgesDisabledPage() {
  notFound();
}
