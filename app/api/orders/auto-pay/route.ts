import { NextRequest, NextResponse } from "next/server";
import { createOrder, markOrderPaid, getProjectCustomerId } from "@/lib/printbox";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    // Look up which customer owns this project
    const customerId = await getProjectCustomerId(projectId);
    console.log("[auto-pay] Project:", projectId, "Customer:", customerId);

    const orderNumber = randomUUID().replace(/-/g, "");

    // Create order with the project
    const order = await createOrder({
      customer_id: customerId,
      number: orderNumber,
      reference: `KIOSK-${Date.now()}`,
      currency: "EUR",
      projects: [{ uuid: projectId, quantity: 1 }],
    });

    // Immediately mark as paid so it goes to rendering
    const paidOrder = await markOrderPaid(order.number);

    return NextResponse.json({
      orderNumber: paidOrder.number,
      status: paidOrder.status,
    });
  } catch (error) {
    console.error("Failed to auto-pay order:", error);
    return NextResponse.json(
      { error: "Failed to create and pay order" },
      { status: 500 }
    );
  }
}
