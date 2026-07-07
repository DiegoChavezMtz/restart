import { NextResponse } from "next/server";
import { UseCaseError } from "@/application/errors";

export function handleRouteError(error: unknown): NextResponse {
  if (error instanceof UseCaseError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }
  console.error(error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
