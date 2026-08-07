import { NextResponse } from "next/server";

export async function POST(): Promise<NextResponse> {
  return NextResponse.json({ error: "El lote se publica mediante espacios transaccionales individuales." }, { status: 410 });
}
