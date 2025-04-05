"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { cn } from "@/lib/utils";
import { clientData } from "@/lib/seed-client";
import { ApiClient } from "@/lib/api-client";

type Todo = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
};

export default function TodoComponent() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncPending, setSyncPending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
      createdAt: new Date().toISOString()
    };
    
    // Optimistically update the UI
    setTodos(prev => [newTodoItem, ...prev]);
    setNewTodo("");
    
    // Try to save to API if online
    if (isOnline) {
      try {
        const response = await ApiClient.post('/api/todos', { title: newTodoItem.title });
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">My Todos</h2>
        <div className="flex items-center gap-2 text-sm">
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
      </div>
      
      <form onSubmit={addTodo} className="flex gap-2 mb-6">
        <Input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="Add a new todo..."
          className="flex-1"
        />
        <Button type="submit" disabled={!newTodo.trim()}>
          Add
        </Button>
      </form>
      
      <div className="space-y-3">
        {todos.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No todos yet. Add some!</p>
        ) : (
          todos.map((todo) => (
            <div key={todo.id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
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
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => deleteTodo(todo.id)}
              >
                Delete
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 