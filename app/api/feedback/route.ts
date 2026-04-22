import { NextResponse } from "next/server";
import { query } from "@/lib/postgres";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { rating, comment } = body;

    if (!rating) {
      return NextResponse.json(
        { error: "Rating zorunlu." },
        { status: 400 }
      );
    }

    await query(
      `
      INSERT INTO feedbacks (rating, comment)
      VALUES ($1, $2)
      `,
      [rating, comment?.trim() || null]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Feedback API error:", error);
    return NextResponse.json(
      { error: "Sunucu hatası." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID zorunlu." },
        { status: 400 }
      );
    }

    await query(`DELETE FROM feedbacks WHERE id = $1`, [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Feedback delete error:", error);
    return NextResponse.json(
      { error: "Silme işlemi başarısız." },
      { status: 500 }
    );
  }
}