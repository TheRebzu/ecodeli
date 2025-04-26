export default async function InvoiceDetailPage(props) {
  const params = await props.params;
  return <div>Détail de la facture {params.id}</div>;
}
