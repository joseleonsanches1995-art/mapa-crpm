import { NextRequest, NextResponse } from "next/server";
import { fetchMunicipios } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const bm = req.nextUrl.searchParams.get("bm");
  const municipios = await fetchMunicipios(bm);
  return NextResponse.json({ municipios, count: municipios.length });
}
