export default async function ServiceDetailPage(props) {
  const params = await props.params;
  return <div>Détail du service {params.id}</div>;
}
