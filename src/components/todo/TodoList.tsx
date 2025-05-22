import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { TodoItem } from './TodoItem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

export function TodoList() {
  const t = useTranslations('todo');
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState('');

  const addTodo = () => {
    if (newTodo.trim() === '') return;
    
    const todo: Todo = {
      id: Date.now().toString(),
      text: newTodo,
      completed: false
    };
    
    setTodos([...todos, todo]);
    setNewTodo('');
  };

  const toggleTodo = (id: string) => {
    setTodos(
      todos.map(todo => 
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTodo();
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      
      <div className="flex gap-2">
        <Input
          value={newTodo}
          onChange={e => setNewTodo(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('inputPlaceholder')}
          className="flex-1"
        />
        <Button onClick={addTodo}>{t('addButton')}</Button>
      </div>
      
      {todos.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          {t('emptyState')}
        </p>
      ) : (
        <ul className="space-y-2">
          {todos.map(todo => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={toggleTodo}
              onDelete={deleteTodo}
            />
          ))}
        </ul>
      )}
    </div>
  );
} 