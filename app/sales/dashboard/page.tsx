import { redirect } from "next/navigation";
import { SalesStaffWorkspace } from "@/components/SalesStaffWorkspace";
import { getCurrentSalesSession } from "@/lib/sales-session";

export const dynamic = "force-dynamic";

export default async function SalesDashboardPage() {
  const session = await getCurrentSalesSession();

  if (!session) {
    redirect("/sales/login");
  }

  return (
    <SalesStaffWorkspace
      staffName={session.salesUser.name}
      staffId={session.salesUser.staff_id}
    />
  );
}