import { NextRequest, NextResponse } from "next/server";
import { sendRenderedFile } from "@/lib/email";
import { getOrderProjects, getOrder } from "@/lib/printbox";
import {
  isConfigured as isMailchimpConfigured,
  getEmailByOrderNumber,
  removeOrderTag,
} from "@/lib/mailchimp";

interface WebhookPayload {
  hook_id: number;
  model: string;
  event: string;
  data: {
    number: string;
    status: string;
    [key: string]: unknown;
  };
}

function looksLikeEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

// Printbox webhook callback for order events
export async function POST(request: NextRequest) {
  try {
    const payload: WebhookPayload = await request.json();
    console.log("[webhook] Received:", payload.model, payload.event, payload.data?.status, payload.data?.number);
    console.log("[webhook] Full payload:", JSON.stringify(payload));

    if (payload.model === "Order" && payload.event === "updated") {
      const orderNumber = payload.data?.number;
      const status = payload.data?.status;

      if (status === "Rendered" && orderNumber) {
        // Fetch projects for this order to get the render URL
        const projects = await getOrderProjects(orderNumber);
        console.log("[webhook] Found", projects.length, "projects for order:", orderNumber);

        const renderedProject = projects.find(
          (p) => p.render_status === "SUCCESS" && p.render_url
        );

        if (!renderedProject?.render_url) {
          console.log("[webhook] No rendered project found for order:", orderNumber);
          return NextResponse.json({ ok: true });
        }

        console.log("[webhook] Render URL:", renderedProject.render_url);

        // 1) Try to get email from order reference (stored during auto-pay)
        let email: string | null = null;
        try {
          const order = await getOrder(orderNumber);
          console.log("[webhook] Order reference:", order.reference);
          if (order.reference && looksLikeEmail(order.reference)) {
            email = order.reference;
            console.log("[webhook] Got email from order reference:", email);
          }
        } catch (err) {
          console.warn("[webhook] Failed to fetch order:", err);
        }

        // 2) Fallback: look up email from Mailchimp
        if (!email && isMailchimpConfigured()) {
          email = await getEmailByOrderNumber(orderNumber);
          if (email) {
            console.log("[webhook] Got email from Mailchimp:", email);
          }
        }

        if (!email) {
          console.warn("[webhook] No email found for order:", orderNumber);
          return NextResponse.json({ ok: true });
        }

        // Send email with rendered file
        await sendRenderedFile(email, renderedProject.render_url, orderNumber);
        console.log("[webhook] Email sent to:", email, "for order:", orderNumber);

        // Clean up Mailchimp tag if configured
        if (isMailchimpConfigured()) {
          try {
            await removeOrderTag(email, orderNumber);
          } catch (err) {
            console.warn("[webhook] Failed to remove Mailchimp tag:", err);
          }
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[webhook] Error:", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
