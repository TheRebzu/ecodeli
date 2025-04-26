export default async function DelivererMessageDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return <div>Conversation {params.id}</div>;
}