import TodoComponent from "@/components/Todo";

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="p-4 bg-white rounded-lg shadow mb-6">
            <h2 className="text-xl font-semibold mb-2">Welcome!</h2>
            <p className="text-gray-600">
              This is your personal dashboard. Here you can manage your tasks, 
              view statistics, and access your account information.
            </p>
          </div>
          
          <div className="p-4 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">Quick Stats</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">Orders</p>
                <p className="text-2xl font-bold">12</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-800">Favorites</p>
                <p className="text-2xl font-bold">8</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg">
                <p className="text-sm text-amber-800">Reviews</p>
                <p className="text-2xl font-bold">5</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-800">Points</p>
                <p className="text-2xl font-bold">230</p>
              </div>
            </div>
          </div>
        </div>
        
        <div>
          <TodoComponent />
        </div>
      </div>
    </div>
  );
} 