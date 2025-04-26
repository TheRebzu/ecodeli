export default async function AnnouncementDetailPage(props) {
  const params = await props.params;
  return <div>Détail de l'annonce {params.id}</div>;
}
