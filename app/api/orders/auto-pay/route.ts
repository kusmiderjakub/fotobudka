import { NextRequest, NextResponse } from "next/server";
import { createOrder, markOrderPaid, getProjectCustomerId } from "@/lib/printbox";
import { Redis } from "@upstash/redis";
import { randomUUID } from "crypto";

const redis = Redis.fromEnv();

export async function POST(request: NextRequest) {
  let step = "parsing request";
  try {
    const { projectId, email } = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    // Step 1: Look up which customer owns this project
    step = "looking up project customer";
    console.log("[auto-pay] Step 1: Looking up customer for project:", projectId);
    const customerId = await getProjectCustomerId(projectId);
    console.log("[auto-pay] Customer ID:", customerId);

    // Step 2: Create order with the project
    step = "creating order";
    const orderNumber = randomUUID().replace(/-/g, "").slice(0, 20);
    console.log("[auto-pay] Step 2: Creating order:", orderNumber);
    const order = await createOrder({
      customer_id: customerId,
      number: orderNumber,
      reference: `KIOSK-${Date.now()}`,
      currency: "EUR",
      projects: [{ uuid: projectId, quantity: 1 }],
    });
    console.log("[auto-pay] Order created:", order.number, "status:", order.status);

    // Step 3: Immediately mark as paid so it goes to rendering
    step = "marking order as paid";
    console.log("[auto-pay] Step 3: Marking order as paid");
    const paidOrder = await markOrderPaid(order.number);
    console.log("[auto-pay] Order paid, status:", paidOrder.status);

    // Step 4: Store email in Redis so the webhook can look it up later
    if (email) {
      step = "storing email in Redis";
      console.log("[auto-pay] Step 4: Storing email in Redis");
      await redis.set(
        `order:${paidOrder.number}`,
        { email, projectId, createdAt: new Date().toISOString() },
        { ex: 86400 } // 24h TTL
      );
      console.log("[auto-pay] Stored email for order:", paidOrder.number);
    }

    return NextResponse.json({
      orderNumber: paidOrder.number,
      status: paidOrder.status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[auto-pay] Failed at step "${step}":`, message);
    return NextResponse.json(
      { error: `Failed at step: ${step}`, details: message },
      { status: 500 }
    );
  }
}
