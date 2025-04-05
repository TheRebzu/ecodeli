export default function Loading() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="relative h-10 w-10">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        <span className="sr-only">Chargement...</span>
      </div>
    </div>
  );
} 