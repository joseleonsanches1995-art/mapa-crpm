import { NextResponse } from "next/server";
import { fetchUnidadesBm } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const unidades = await fetchUnidadesBm();
  return NextResponse.json({ unidades });
}
