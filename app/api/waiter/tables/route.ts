import { NextResponse } from "next/server";
import { query } from "@/lib/postgres";

type TableRow = {
  id: string;
  name: string;
  status: string;
};

export async function GET() {
  try {
    const data = await query<TableRow>(
      `
      SELECT id, name, status
      FROM tables
      ORDER BY id ASC
      `
    );

    return NextResponse.json({ data, error: null });
  } catch (error) {
    console.error("[/api/waiter/tables] error:", error);
    return NextResponse.json(
      {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
