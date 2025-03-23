import { redirect } from "next/navigation";

export default function ShipmentDetailsPage({
  params,
}: {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // Redirect to the centralized admin panel version of this page
  redirect(`/admin/shipments/${params.id}`);
} 