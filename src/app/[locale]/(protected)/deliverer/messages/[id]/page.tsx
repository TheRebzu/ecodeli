export default async function DelivererMessageDetailPage(props: {
  params: Promise<{ id }>;
}) {
  const params = await props.params;
  return <div>Conversation {params.id}</div>;
}
