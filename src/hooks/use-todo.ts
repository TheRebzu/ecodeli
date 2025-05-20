import { useTranslations } from 'next-intl';
import { useTodoStore } from '@/store/use-todo-store';
import { TodoItem } from '@/components/todo';
import { useToast } from '@/components/ui/use-toast';

export function useTodo() {
  const t = useTranslations('todo');
  const { toast } = useToast();
  
  const todos = useTodoStore((state) => state.todos);
  const isFormVisible = useTodoStore((state) => state.isFormVisible);
  const activeFilter = useTodoStore((state) => state.activeFilter);
  const filteredTodos = useTodoStore((state) => state.getFilteredTodos());
  
  const addTodo = useTodoStore((state) => state.addTodo);
  const toggleTodo = useTodoStore((state) => state.toggleTodo);
  const deleteTodo = useTodoStore((state) => state.deleteTodo);
  const showForm = useTodoStore((state) => state.showForm);
  const hideForm = useTodoStore((state) => state.hideForm);
  const setFilter = useTodoStore((state) => state.setFilter);

  const handleToggle = (id: string, completed: boolean) => {
    toggleTodo(id, completed);
    
    toast({
      title: completed ? t('notifications.taskCompleted') : t('notifications.taskReactivated'),
      variant: completed ? 'default' : 'destructive',
      children: completed 
        ? t('notifications.taskCompletedDesc') 
        : t('notifications.taskReactivatedDesc'),
    });
  };

  const handleDelete = (id: string) => {
    deleteTodo(id);
    
    toast({
      title: t('notifications.taskDeleted'),
      variant: 'destructive',
      children: t('notifications.taskDeletedDesc'),
    });
  };

  const handleAddTodo = (newTodo: Omit<TodoItem, 'id'>) => {
    addTodo(newTodo);
    
    toast({
      title: t('notifications.taskAdded'),
      children: t('notifications.taskAddedDesc'),
    });
  };

  return {
    todos,
    filteredTodos,
    isFormVisible,
    activeFilter,
    handleToggle,
    handleDelete,
    handleAddTodo,
    showForm,
    hideForm,
    setFilter,
  };
} 