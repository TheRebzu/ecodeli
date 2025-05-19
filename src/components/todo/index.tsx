'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  CalendarClock,
  CheckCircle2,
  Circle,
  DollarSign,
  Plus,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export type TodoItem = {
  id: string;
  title: string;
  description?: string;
  dueDate?: Date;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  category: 'payment' | 'invoice' | 'withdrawal' | 'other';
};

interface TodoProps {
  title?: string;
  description?: string;
  items: TodoItem[];
  onToggle?: (id: string, completed: boolean) => void;
  onDelete?: (id: string) => void;
  onAdd?: () => void;
  showAddButton?: boolean;
  priority?: 'low' | 'medium' | 'high';
}

/**
 * Composant TodoMarker qui affiche un élément visuel pour indiquer du travail à terminer
 * Ce composant est utile pendant le développement pour marquer les fonctionnalités inachevées
 */
function TodoMarker({
  title = 'À implémenter',
  description = 'Cette fonctionnalité est en cours de développement et sera disponible prochainement.',
  priority = 'medium',
}: {
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
}) {
  // Couleurs basées sur la priorité
  const colors = {
    low: 'bg-blue-50 text-blue-800 border-blue-200',
    medium: 'bg-amber-50 text-amber-800 border-amber-200',
    high: 'bg-red-50 text-red-800 border-red-200',
  };

  const colorClass = colors[priority];

  return (
    <Alert className={`border ${colorClass}`}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
}

/**
 * Composant Todo pour gérer une liste de tâches
 */
export function Todo({
  title = 'Tâches financières',
  description = 'Liste des tâches financières à accomplir',
  items = [],
  onToggle,
  onDelete,
  onAdd,
  showAddButton = true,
}: TodoProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const getPriorityClass = (priority: TodoItem['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryIcon = (category: TodoItem['category']) => {
    switch (category) {
      case 'payment':
        return <DollarSign className="h-4 w-4 text-blue-500" />;
      case 'invoice':
        return <CalendarClock className="h-4 w-4 text-purple-500" />;
      case 'withdrawal':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default:
        return <Circle className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDate = (date?: Date) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-6 text-gray-500">Aucune tâche financière à afficher</div>
          ) : (
            items.map(item => (
              <div
                key={item.id}
                className={cn(
                  'flex items-start space-x-2 p-3 rounded-md border',
                  item.completed ? 'bg-gray-50 opacity-70' : ''
                )}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <Checkbox
                  checked={item.completed}
                  onCheckedChange={checked => onToggle?.(item.id, checked as boolean)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p
                      className={cn(
                        'font-medium text-sm',
                        item.completed ? 'line-through text-gray-500' : ''
                      )}
                    >
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-full border',
                          getPriorityClass(item.priority)
                        )}
                      >
                        {item.priority}
                      </span>
                      <div className="flex items-center">{getCategoryIcon(item.category)}</div>
                    </div>
                  </div>
                  {item.description && (
                    <p
                      className={cn(
                        'text-xs text-gray-600 mt-1',
                        item.completed ? 'line-through' : ''
                      )}
                    >
                      {item.description}
                    </p>
                  )}
                  {item.dueDate && (
                    <p className="text-xs text-gray-500 mt-1">
                      Échéance: {formatDate(item.dueDate)}
                    </p>
                  )}
                </div>
                {hoveredItem === item.id && onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onDelete(item.id)}
                  >
                    <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" />
                  </Button>
                )}
              </div>
            ))
          )}
          {showAddButton && onAdd && (
            <Button variant="outline" className="w-full mt-4" onClick={onAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter une tâche
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Exportation du composant TodoMarker par défaut
export default TodoMarker;
