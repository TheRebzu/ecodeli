export default async function DeliveryDetailPage(props) {
  const params = await props.params;
  return <div>Détail de la livraison {params.id}</div>;
}
