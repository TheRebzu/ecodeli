import { useState } from 'react';
import { ChevronDown, ChevronRight, CopyIcon, CheckIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface JsonViewProps {
  data: Record<string, unknown>;
  level?: number;
  isExpanded?: boolean;
}

/**
 * Composant pour afficher des données JSON de manière formatée
 * avec la possibilité de développer/réduire les objets et tableaux
 */
export function JsonView({ data, level = 0, isExpanded = true }: JsonViewProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  const toggleExpand = (key: string) => {
    setExpanded(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const renderValue = (key: string, value: unknown, currentLevel: number) => {
    // Valeur null ou undefined
    if (value === null || value === undefined) {
      return <span className="text-gray-400">null</span>;
    }

    // Chaîne de caractères
    if (typeof value === 'string') {
      return <span className="text-green-500">"{value}"</span>;
    }

    // Nombre
    if (typeof value === 'number') {
      return <span className="text-blue-500">{value}</span>;
    }

    // Booléen
    if (typeof value === 'boolean') {
      return <span className="text-purple-500">{value.toString()}</span>;
    }

    // Date
    if (value instanceof Date) {
      return <span className="text-pink-500">"{value.toISOString()}"</span>;
    }

    // Array
    if (Array.isArray(value)) {
      const isExpandedKey = `${key}-${currentLevel}`;
      const isCurrentlyExpanded = expanded[isExpandedKey] ?? isExpanded;

      return (
        <div className="ml-4">
          <div
            className="flex items-center cursor-pointer"
            onClick={() => toggleExpand(isExpandedKey)}
          >
            {isCurrentlyExpanded ? (
              <ChevronDown className="h-3 w-3 mr-1" />
            ) : (
              <ChevronRight className="h-3 w-3 mr-1" />
            )}
            <span className="text-gray-500">Array({value.length})</span>
          </div>

          {isCurrentlyExpanded && (
            <div className="ml-4 border-l pl-4 border-gray-300 dark:border-gray-700">
              {value.map((item, index) => (
                <div key={index} className="my-1">
                  <span className="text-gray-400">{index}: </span>
                  {renderValue(`${key}-${index}`, item, currentLevel + 1)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Object
    if (typeof value === 'object') {
      const isExpandedKey = `${key}-${currentLevel}`;
      const isCurrentlyExpanded = expanded[isExpandedKey] ?? isExpanded;

      return (
        <div className="ml-4">
          <div
            className="flex items-center cursor-pointer"
            onClick={() => toggleExpand(isExpandedKey)}
          >
            {isCurrentlyExpanded ? (
              <ChevronDown className="h-3 w-3 mr-1" />
            ) : (
              <ChevronRight className="h-3 w-3 mr-1" />
            )}
            <span className="text-gray-500">Object</span>
          </div>

          {isCurrentlyExpanded && (
            <div className="ml-4 border-l pl-4 border-gray-300 dark:border-gray-700">
              {Object.entries(value).map(([k, v]) => (
                <div key={k} className="my-1">
                  <span className="text-gray-600 dark:text-gray-400">{k}: </span>
                  {renderValue(`${key}-${k}`, v, currentLevel + 1)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Autres types
    return <span>{String(value)}</span>;
  };

  return (
    <div className={cn('font-mono text-sm', { 'pl-4': level > 0 })}>
      {level === 0 && (
        <div className="flex justify-end mb-2">
          <Button variant="ghost" size="sm" onClick={copyToClipboard} className="h-6 px-2">
            {copied ? (
              <CheckIcon className="h-3 w-3 mr-1" />
            ) : (
              <CopyIcon className="h-3 w-3 mr-1" />
            )}
            {copied ? 'Copié' : 'Copier'}
          </Button>
        </div>
      )}
      <div className="space-y-1">
        {Object.entries(data).map(([key, value]) => (
          <div key={key}>
            <span className="text-gray-600 dark:text-gray-400">{key}: </span>
            {renderValue(key, value, level)}
          </div>
        ))}
      </div>
    </div>
  );
}
