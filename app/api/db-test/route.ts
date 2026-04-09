import { NextResponse } from "next/server";
import { query } from "@/lib/postgres";

export async function GET() {
  try {
    const rows = await query("SELECT NOW() as now");
    return NextResponse.json({ ok: true, rows });
  } catch (error) {
    console.error("DB TEST ERROR:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
