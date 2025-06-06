import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { TodoItem } from '@/store/use-todo-store';

interface TodoState {
  todos: TodoItem[];
  isFormVisible: boolean;
  activeFilter: 'all' | 'active' | 'completed';
  // Actions
  addTodo: (todo: Omit<TodoItem, 'id'>) => void;
  toggleTodo: (id: string, completed: boolean) => void;
  deleteTodo: (id: string) => void;
  showForm: () => void;
  hideForm: () => void;
  setFilter: (filter: 'all' | 'active' | 'completed') => void;
  getFilteredTodos: () => TodoItem[];
}

const initialTodos: TodoItem[] = [
  {
    id: '1',
    title: 'Analyser les dépenses mensuelles',
    description: 'Examiner les dépenses du mois dernier pour identifier les économies potentielles',
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
];

export const useTodoStore = create<TodoState>()(
  persist(
    (set, get) => ({
      todos: initialTodos,
      isFormVisible: false,
      activeFilter: 'all',

      addTodo: todo => {
        const newTodo = {
          ...todo,
          id: uuidv4(),
        };
        set(state => ({
          todos: [...state.todos, newTodo],
          isFormVisible: false,
        }));
      },

      toggleTodo: (id, completed) => {
        set(state => ({
          todos: state.todos.map(todo => (todo.id === id ? { ...todo, completed } : todo)),
        }));
      },

      deleteTodo: id => {
        set(state => ({
          todos: state.todos.filter(todo => todo.id !== id),
        }));
      },

      showForm: () => set({ isFormVisible: true }),
      hideForm: () => set({ isFormVisible: false }),

      setFilter: filter => set({ activeFilter: filter }),

      getFilteredTodos: () => {
        const { todos, activeFilter } = get();
        switch (activeFilter) {
          case 'active':
            return todos.filter(todo => !todo.completed);
          case 'completed':
            return todos.filter(todo => todo.completed);
          default:
            return todos;
        }
      },
    }),
    {
      name: 'todo-storage',
    }
  )
);
