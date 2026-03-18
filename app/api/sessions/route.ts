import { NextResponse } from "next/server";
import { createCustomer, createSession } from "@/lib/printbox";

export async function POST() {
  try {
    const email = `kiosk-${Date.now()}@fotobudka.local`;
    const customer = await createCustomer(email);
    const session = await createSession(customer.id);

    return NextResponse.json({
      sessionKey: session.session_key,
      customerId: customer.id,
      expiryDate: session.expiry_date,
    });
  } catch (error) {
    console.error("Failed to create session:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}
