import { NextResponse } from "next/server";
import { query } from "@/lib/postgres";

export async function GET() {
    try {
        const result: any = await query(`
      SELECT id, rating, comment, created_at
      FROM feedbacks
      ORDER BY id DESC
    `);

        const feedbacks = Array.isArray(result) ? result : result?.rows ?? [];

        return NextResponse.json({ feedbacks });
    } catch (error) {
        console.error("Feedback list error:", error);
        return NextResponse.json(
            { error: "Geri bildirimler alınamadı.", feedbacks: [] },
            { status: 500 }
        );
    }
}