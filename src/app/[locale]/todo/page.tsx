'use client';

import { useTranslations } from 'next-intl';
import { Todo } from '@/components/todo';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TodoForm } from '@/components/todo/todo-form';
import { useTodo } from '@/hooks/use-todo';
import { TodoList } from '@/components/todo/TodoList';

export default function TodoPage() {
  const t = useTranslations('todo');
  const {
    filteredTodos,
    isFormVisible,
    activeFilter,
    handleToggle,
    handleDelete,
    handleAddTodo,
    showForm,
    hideForm,
    setFilter,
  } = useTodo();

  return (
    <div className="container py-8">
      <TodoList />
    </div>
  );
}
