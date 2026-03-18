import { NextRequest, NextResponse } from "next/server";
import { markOrderPaid } from "@/lib/printbox";

// Printbox webhook callback for order events
// Subscribe via: POST /api/ec/v4/subscriptions/
// with hooks: [{ model: "Order", events: ["created"] }]
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    if (payload.model === "Order" && payload.event === "created") {
      const orderNumber = payload.data?.number;
      if (orderNumber) {
        await markOrderPaid(orderNumber);
        console.log(`Auto-paid order: ${orderNumber}`);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
