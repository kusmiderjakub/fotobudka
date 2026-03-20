import { Suspense } from "react";
import OrderCompleteContent from "./OrderCompleteContent";

export const dynamic = "force-dynamic";

export default function OrderCompletePage() {
  return (
    <Suspense>
      <OrderCompleteContent />
    </Suspense>
  );
}
