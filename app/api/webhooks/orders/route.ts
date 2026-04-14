import { NextRequest, NextResponse } from "next/server";
import { sendRenderedFile } from "@/lib/email";
import { getOrderProjects } from "@/lib/printbox";
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

        // Look up email from Mailchimp
        if (!isMailchimpConfigured()) {
          console.warn("[webhook] Mailchimp not configured, cannot look up email for order:", orderNumber);
          return NextResponse.json({ ok: true });
        }

        const email = await getEmailByOrderNumber(orderNumber);

        if (!email) {
          console.log("[webhook] No email found in Mailchimp for order:", orderNumber);
          return NextResponse.json({ ok: true });
        }

        // Send email with rendered file
        await sendRenderedFile(email, renderedProject.render_url, orderNumber);
        console.log("[webhook] Email sent to:", email, "for order:", orderNumber);

        // Remove the order-specific tag (keep subscriber in audience)
        await removeOrderTag(email, orderNumber);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[webhook] Error:", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
