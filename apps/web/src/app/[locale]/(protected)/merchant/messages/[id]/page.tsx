export default async function MerchantMessageDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  return <div>Conversation {params.id}</div>;
}
