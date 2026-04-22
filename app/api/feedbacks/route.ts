import { NextResponse } from "next/server";
import { query } from "@/lib/postgres";

type FeedbackRow = {
    id: number;
    rating: string;
    comment: string | null;
    created_at: string;
};

type QueryRowsResult<T> = {
    rows?: T[];
};

export async function GET() {
    try {
        const result = await query(`
      SELECT id, rating, comment, created_at
      FROM feedbacks
      ORDER BY id DESC
    `);

        const feedbacks: FeedbackRow[] = Array.isArray(result)
            ? (result as FeedbackRow[])
            : ((result as QueryRowsResult<FeedbackRow>)?.rows ?? []);

        return NextResponse.json({ feedbacks });
    } catch (error) {
        console.error("Feedback list error:", error);
        return NextResponse.json(
            { error: "Geri bildirimler alınamadı.", feedbacks: [] },
            { status: 500 }
        );
    }
}