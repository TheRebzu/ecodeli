import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Todo } from './TodoList';

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  const t = useTranslations('todo');

  return (
    <li className="flex items-center justify-between p-3 border rounded-md">
      <div className="flex items-center gap-2">
        <Checkbox 
          id={`todo-${todo.id}`}
          checked={todo.completed}
          onCheckedChange={() => onToggle(todo.id)}
        />
        <label
          htmlFor={`todo-${todo.id}`}
          className={`${
            todo.completed ? 'line-through text-gray-500' : ''
          }`}
        >
          {todo.text}
        </label>
      </div>
      
      <Button 
        variant="destructive" 
        size="sm" 
        onClick={() => onDelete(todo.id)}
      >
        {t('deleteButton')}
      </Button>
    </li>
  );
} 