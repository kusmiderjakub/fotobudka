import { NextRequest, NextResponse } from "next/server";
import { markOrderPaid } from "@/lib/printbox";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  try {
    const { number } = await params;
    const order = await markOrderPaid(number);
    return NextResponse.json(order);
  } catch (error) {
    console.error("Failed to mark order as paid:", error);
    return NextResponse.json(
      { error: "Failed to mark order as paid" },
      { status: 500 }
    );
  }
}
