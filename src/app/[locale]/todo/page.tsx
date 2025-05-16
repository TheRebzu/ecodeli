'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Todo, TodoItem } from '@/components/todo';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TodoForm } from '@/components/todo/todo-form';
import { useToast } from '@/components/ui/use-toast';

export default function TodoPage() {
  const t = useTranslations('Todo');
  const { toast } = useToast();

  const [todoItems, setTodoItems] = useState<TodoItem[]>([
    {
      id: '1',
      title: 'Analyser les dépenses mensuelles',
      description:
        'Examiner les dépenses du mois dernier pour identifier les économies potentielles',
      dueDate: new Date(2024, 6, 15),
      completed: false,
      priority: 'high',
      category: 'invoice',
    },
    {
      id: '2',
      title: 'Payer les factures fournisseurs',
      description: 'Traiter les paiements des fournisseurs avant la fin du mois',
      dueDate: new Date(2024, 6, 20),
      completed: false,
      priority: 'medium',
      category: 'payment',
    },
    {
      id: '3',
      title: 'Approuver les demandes de retrait',
      description: 'Vérifier et approuver les demandes de retrait des livreurs',
      dueDate: new Date(2024, 6, 10),
      completed: true,
      priority: 'low',
      category: 'withdrawal',
    },
  ]);

  const [showForm, setShowForm] = useState(false);

  const handleToggle = (id: string, completed: boolean) => {
    setTodoItems(items => items.map(item => (item.id === id ? { ...item, completed } : item)));

    toast({
      title: completed ? 'Tâche terminée' : 'Tâche réactivée',
      description: completed ? 'La tâche a été marquée comme terminée' : 'La tâche a été réactivée',
      variant: completed ? 'default' : 'destructive',
    });
  };

  const handleDelete = (id: string) => {
    setTodoItems(items => items.filter(item => item.id !== id));

    toast({
      title: 'Tâche supprimée',
      description: 'La tâche a été supprimée avec succès',
      variant: 'destructive',
    });
  };

  const handleAddClick = () => {
    setShowForm(true);
  };

  const handleAddTodo = (newTodo: Omit<TodoItem, 'id'>) => {
    const todoWithId = {
      ...newTodo,
      id: uuidv4(),
    };

    setTodoItems(prev => [...prev, todoWithId]);
    setShowForm(false);

    toast({
      title: 'Tâche ajoutée',
      description: 'La nouvelle tâche a été ajoutée avec succès',
    });
  };

  const handleCancelAdd = () => {
    setShowForm(false);
  };

  const getFilteredItems = (filter: 'all' | 'active' | 'completed') => {
    switch (filter) {
      case 'active':
        return todoItems.filter(item => !item.completed);
      case 'completed':
        return todoItems.filter(item => item.completed);
      default:
        return todoItems;
    }
  };

  return (
    <div className="container py-6 space-y-6">
      <PageHeader title={t('title')} description={t('description')} />

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="all">{t('filters.all')}</TabsTrigger>
          <TabsTrigger value="active">{t('filters.active')}</TabsTrigger>
          <TabsTrigger value="completed">{t('filters.completed')}</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {showForm ? (
            <TodoForm onSubmit={handleAddTodo} onCancel={handleCancelAdd} />
          ) : (
            <Todo
              title={t('allTasks')}
              description={t('allTasksDescription')}
              items={getFilteredItems('all')}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onAdd={handleAddClick}
            />
          )}
        </TabsContent>

        <TabsContent value="active" className="mt-6">
          {showForm ? (
            <TodoForm onSubmit={handleAddTodo} onCancel={handleCancelAdd} />
          ) : (
            <Todo
              title={t('activeTasks')}
              description={t('activeTasksDescription')}
              items={getFilteredItems('active')}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onAdd={handleAddClick}
            />
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          <Todo
            title={t('completedTasks')}
            description={t('completedTasksDescription')}
            items={getFilteredItems('completed')}
            onToggle={handleToggle}
            onDelete={handleDelete}
            showAddButton={false}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
