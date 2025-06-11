export default async function ClientMessageDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return <div>Conversation {params.id}</div>;
}
