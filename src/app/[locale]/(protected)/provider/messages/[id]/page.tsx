export default async function ProviderMessageDetailPage(props: {
  params: Promise<{ id }>;
}) {
  const params = await props.params;
  return <div>Conversation {params.id}</div>;
}
