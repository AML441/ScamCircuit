import { db } from "@/lib/db";

export async function GET() {
  try {
    const result = await db.query("SELECT NOW() AS time");

    return Response.json({
      connected: true,
      time: result.rows[0].time,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { connected: false, error: "Connection failed" },
      { status: 500 }
    );
  }
}
