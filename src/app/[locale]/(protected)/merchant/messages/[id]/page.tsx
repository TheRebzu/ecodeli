export default async function MerchantMessageDetailPage(props: {
  params: Promise<{ id }>;
}) {
  const params = await props.params;
  return <div>Conversation {params.id}</div>;
}
