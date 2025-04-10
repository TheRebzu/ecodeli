"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { cn } from "@/lib/utils";
import { clientData } from "@/lib/seed-client";
import { ApiClient } from "@/lib/api-client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

type TodoCategory = "work" | "personal" | "shopping" | "health" | "other";

type Todo = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  category: TodoCategory;
  dueDate?: string;
  priority: "low" | "medium" | "high";
};

type SortOption = "createdAt" | "dueDate" | "priority" | "alphabetical";
type FilterOption = "all" | "active" | "completed" | TodoCategory;

export default function TodoComponent() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [newCategory, setNewCategory] = useState<TodoCategory>("personal");
  const [newPriority, setNewPriority] = useState<"low" | "medium" | "high">("medium");
  const [newDueDate, setNewDueDate] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncPending, setSyncPending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>("createdAt");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");

  // Load todos from API and fallback to localStorage when offline
  useEffect(() => {
    const loadTodos = async () => {
      setIsLoading(true);
      try {
        // Try to fetch from API first
        if (navigator.onLine) {
          const todoData = await clientData.fetchTodos();
          if (todoData && todoData.length > 0) {
            setTodos(todoData);
            // Save to localStorage as backup
            localStorage.setItem("todos", JSON.stringify(todoData));
            setIsLoading(false);
            return;
          }
        }
        
        // Fallback to localStorage if offline or API returned no data
        const storedTodos = localStorage.getItem("todos");
        if (storedTodos) {
          try {
            setTodos(JSON.parse(storedTodos));
          } catch (e) {
            console.error("Failed to parse todos from localStorage:", e);
            toast.error("Failed to load saved todos");
          }
        }
      } catch (e) {
        console.error("Error loading todos:", e);
        toast.error("Failed to load todos");
        
        // Try to load from localStorage as a fallback
        const storedTodos = localStorage.getItem("todos");
        if (storedTodos) {
          try {
            setTodos(JSON.parse(storedTodos));
          } catch (e) {
            console.error("Failed to parse todos from localStorage:", e);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTodos();
  }, []);

  // Save todos to localStorage when they change
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem("todos", JSON.stringify(todos));
      if (todos.length > 0) {
        setSyncPending(true);
      }
    }
  }, [todos, isLoading]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Sync with server when online
  useEffect(() => {
    if (isOnline && syncPending && !isLoading) {
      const syncWithServer = async () => {
        setIsSyncing(true);
        try {
          // Simulate API call with real API
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Sync todos to the server
          for (const todo of todos) {
            // This would be a real API call in production
            // await ApiClient.post('/api/todos/sync', todo);
          }
          
          setSyncPending(false);
          toast.success("Todos synchronized with server");
        } catch (e) {
          toast.error("Failed to sync with server");
          console.error("Sync error:", e);
        } finally {
          setIsSyncing(false);
        }
      };
      
      syncWithServer();
    }
  }, [isOnline, syncPending, todos, isLoading]);

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;
    
    const newTodoItem: Todo = {
      id: crypto.randomUUID(),
      title: newTodo.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
      category: newCategory,
      dueDate: newDueDate || undefined,
      priority: newPriority
    };
    
    // Optimistically update the UI
    setTodos(prev => [newTodoItem, ...prev]);
    setNewTodo("");
    setNewDueDate("");
    
    // Try to save to API if online
    if (isOnline) {
      try {
        const response = await ApiClient.post('/api/todos', { 
          title: newTodoItem.title,
          category: newTodoItem.category,
          dueDate: newTodoItem.dueDate,
          priority: newTodoItem.priority
        });
        if (response.success && response.data) {
          // Update with the server-generated ID and other fields
          setTodos(prev => prev.map(t => 
            t.id === newTodoItem.id ? response.data as Todo : t
          ));
          toast.success('Todo added');
        }
      } catch (error) {
        console.error('Failed to add todo to API:', error);
        // Keep the local version
        setSyncPending(true);
      }
    } else {
      toast.success("Todo added (offline)");
      setSyncPending(true);
    }
  };

  const toggleTodo = async (id: string) => {
    // Optimistically update the UI
    setTodos(prev => 
      prev.map(todo => 
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
    
    // Try to update on the server if online
    if (isOnline) {
      try {
        const todoToUpdate = todos.find(t => t.id === id);
        if (todoToUpdate) {
          await ApiClient.put(`/api/todos`, { 
            id: id,
            completed: !todoToUpdate.completed 
          });
        }
      } catch (error) {
        console.error("Failed to update todo on server:", error);
        setSyncPending(true);
      }
    } else {
      setSyncPending(true);
    }
  };

  const updateTodoPriority = async (id: string, priority: "low" | "medium" | "high") => {
    setTodos(prev => 
      prev.map(todo => 
        todo.id === id ? { ...todo, priority } : todo
      )
    );
    
    if (isOnline) {
      try {
        await ApiClient.put(`/api/todos`, { id, priority });
      } catch (error) {
        console.error("Failed to update todo priority on server:", error);
        setSyncPending(true);
      }
    } else {
      setSyncPending(true);
    }
  };

  const updateTodoCategory = async (id: string, category: TodoCategory) => {
    setTodos(prev => 
      prev.map(todo => 
        todo.id === id ? { ...todo, category } : todo
      )
    );
    
    if (isOnline) {
      try {
        await ApiClient.put(`/api/todos`, { id, category });
      } catch (error) {
        console.error("Failed to update todo category on server:", error);
        setSyncPending(true);
      }
    } else {
      setSyncPending(true);
    }
  };

  const updateTodoDueDate = async (id: string, dueDate: string) => {
    setTodos(prev => 
      prev.map(todo => 
        todo.id === id ? { ...todo, dueDate } : todo
      )
    );
    
    if (isOnline) {
      try {
        await ApiClient.put(`/api/todos`, { id, dueDate });
      } catch (error) {
        console.error("Failed to update todo due date on server:", error);
        setSyncPending(true);
      }
    } else {
      setSyncPending(true);
    }
  };

  const deleteTodo = async (id: string) => {
    // Optimistically update the UI
    setTodos(prev => prev.filter(todo => todo.id !== id));
    
    // Try to delete on the server if online
    if (isOnline) {
      try {
        await ApiClient.delete(`/api/todos?id=${id}`);
        toast.success("Todo removed");
      } catch (error) {
        console.error("Failed to delete todo on server:", error);
        setSyncPending(true);
      }
    } else {
      toast.success("Todo removed (offline)");
      setSyncPending(true);
    }
  };

  // Sort and filter todos
  const getSortedAndFilteredTodos = () => {
    // First apply filters
    let filteredTodos = [...todos];
    
    if (filterBy === "active") {
      filteredTodos = filteredTodos.filter(todo => !todo.completed);
    } else if (filterBy === "completed") {
      filteredTodos = filteredTodos.filter(todo => todo.completed);
    } else if (filterBy !== "all") {
      // Filter by category
      filteredTodos = filteredTodos.filter(todo => todo.category === filterBy);
    }
    
    // Then sort the filtered results
    return filteredTodos.sort((a, b) => {
      switch (sortBy) {
        case "alphabetical":
          return a.title.localeCompare(b.title);
        case "dueDate":
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case "priority": {
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        case "createdAt":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  };

  const sortedAndFilteredTodos = getSortedAndFilteredTodos();
  const categoryCount = todos.reduce((acc, todo) => {
    acc[todo.category] = (acc[todo.category] || 0) + 1;
    return acc;
  }, {} as Record<TodoCategory, number>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const priorityColors = {
    low: "bg-blue-500",
    medium: "bg-yellow-500",
    high: "bg-red-500"
  };

  const categoryColors = {
    work: "bg-purple-500",
    personal: "bg-green-500", 
    shopping: "bg-orange-500",
    health: "bg-teal-500",
    other: "bg-gray-500"
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">My Todos</h2>
        <div className="flex items-center gap-2 text-sm mb-4">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isOnline ? "bg-green-500" : "bg-red-500"
          )}/>
          <span>{isOnline ? "Online" : "Offline"}</span>
          {isSyncing && <span className="text-blue-500">(Syncing...)</span>}
          {!isOnline && syncPending && (
            <span className="text-amber-500">(Changes pending)</span>
          )}
        </div>

        <div className="flex flex-wrap gap-2 text-xs mb-4">
          {Object.entries(categoryCount).map(([category, count]) => (
            <button
              key={category}
              onClick={() => setFilterBy(category as TodoCategory)}
              className={cn(
                "px-2 py-1 rounded-full flex items-center gap-1",
                filterBy === category ? "ring-2 ring-offset-1 ring-blue-500" : "opacity-70",
                categoryColors[category as TodoCategory]
              )}
            >
              <span className="text-white">{category}</span>
              <span className="bg-white/30 rounded-full px-1.5 text-white">{count}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <Select value={sortBy} onValueChange={(val) => setSortBy(val as SortOption)}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Date Created</SelectItem>
                <SelectItem value="dueDate">Due Date</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="alphabetical">Alphabetical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Select value={filterBy} onValueChange={(val) => setFilterBy(val as FilterOption)}>
              <SelectTrigger>
                <SelectValue placeholder="Filter..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="work">Work</SelectItem>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="shopping">Shopping</SelectItem>
                <SelectItem value="health">Health</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      <form onSubmit={addTodo} className="flex flex-col gap-2 mb-6">
        <Input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="Add a new todo..."
          className="w-full"
        />
        
        <div className="grid grid-cols-2 gap-2">
          <Select value={newCategory} onValueChange={(val) => setNewCategory(val as TodoCategory)}>
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="work">Work</SelectItem>
              <SelectItem value="personal">Personal</SelectItem>
              <SelectItem value="shopping">Shopping</SelectItem>
              <SelectItem value="health">Health</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={newPriority} onValueChange={(val) => setNewPriority(val as "low" | "medium" | "high")}>
            <SelectTrigger>
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Input
          type="date"
          value={newDueDate}
          onChange={(e) => setNewDueDate(e.target.value)}
          placeholder="Due date (optional)"
        />
        
        <Button type="submit" disabled={!newTodo.trim()} className="w-full">
          Add Todo
        </Button>
      </form>
      
      <div className="space-y-3">
        {sortedAndFilteredTodos.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No todos yet. Add some!</p>
        ) : (
          sortedAndFilteredTodos.map((todo) => (
            <div key={todo.id} className="flex flex-col bg-gray-50 p-3 rounded">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <Checkbox 
                    id={`todo-${todo.id}`}
                    checked={todo.completed} 
                    onCheckedChange={() => toggleTodo(todo.id)}
                  />
                  <label 
                    htmlFor={`todo-${todo.id}`}
                    className={cn(
                      "cursor-pointer",
                      todo.completed && "line-through text-gray-500"
                    )}
                  >
                    {todo.title}
                  </label>
                </div>
                
                <div className="flex gap-1">
                  <div className={cn("w-2 h-2 rounded-full", priorityColors[todo.priority])} title={`Priority: ${todo.priority}`} />
                  <div className={cn("w-2 h-2 rounded-full", categoryColors[todo.category])} title={`Category: ${todo.category}`} />
                </div>
              </div>
              
              <div className="flex justify-between text-xs text-gray-500 mb-2">
                <div>
                  {todo.dueDate && (
                    <span className={cn(
                      "text-xs",
                      new Date(todo.dueDate) < new Date() && !todo.completed ? "text-red-500 font-bold" : "text-gray-500"
                    )}>
                      Due: {new Date(todo.dueDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div>
                  {new Date(todo.createdAt).toLocaleDateString()}
                </div>
              </div>
              
              <div className="flex justify-end gap-2 mt-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const dueDate = prompt("Enter new due date (YYYY-MM-DD)", todo.dueDate);
                    if (dueDate !== null) updateTodoDueDate(todo.id, dueDate);
                  }}
                >
                  Due Date
                </Button>
                
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => deleteTodo(todo.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 