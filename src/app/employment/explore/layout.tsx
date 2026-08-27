import { redirect } from "next/navigation";

// Descúbrete se conserva en el código como referencia para v2, pero no se
// expone a usuarios durante la primera versión del módulo.
export default function ExplorationLayout() {
  redirect("/employment");
}
