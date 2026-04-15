import { NextRequest, NextResponse } from "next/server";
import { createOrder, markOrderPaid, getProjectCustomerId } from "@/lib/printbox";
import { addSubscriberWithOrder, isConfigured as isMailchimpConfigured } from "@/lib/mailchimp";
import { randomUUID } from "crypto";

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
      reference: email || `KIOSK-${Date.now()}`,
      currency: "EUR",
      projects: [{ uuid: projectId, quantity: 1 }],
    });
    console.log("[auto-pay] Order created:", order.number, "status:", order.status);

    // Step 3: Immediately mark as paid so it goes to rendering
    step = "marking order as paid";
    console.log("[auto-pay] Step 3: Marking order as paid");
    const paidOrder = await markOrderPaid(order.number);
    console.log("[auto-pay] Order paid, status:", paidOrder.status);

    // Step 4: Store email in Mailchimp audience with order tag (non-blocking)
    if (email) {
      if (isMailchimpConfigured()) {
        try {
          await addSubscriberWithOrder(email, paidOrder.number, projectId);
          console.log("[auto-pay] Email stored in Mailchimp for order:", paidOrder.number);
        } catch (mcErr) {
          console.warn("[auto-pay] Mailchimp error (non-blocking):", mcErr);
        }
      } else {
        console.warn("[auto-pay] Mailchimp not configured, skipping email storage");
      }
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
