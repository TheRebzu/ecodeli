"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X, Clock, TrendingUp, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchSuggestion {
  id: string;
  text: string;
  type: "recent" | "trending" | "location" | "service";
  category?: string;
}

export interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  suggestions?: SearchSuggestion[];
  className?: string;
}

// Suggestions par défaut
const defaultSuggestions: SearchSuggestion[] = [
  { id: "1", text: "Livraison Paris", type: "trending", category: "Livraison" },
  { id: "2", text: "Garde d'enfants", type: "trending", category: "Service" },
  { id: "3", text: "Box de stockage", type: "trending", category: "Stockage" },
  { id: "4", text: "Lyon", type: "location" },
  { id: "5", text: "Marseille", type: "location" },
  {
    id: "6",
    text: "Courses alimentaires",
    type: "service",
    category: "Service",
  },
];

export function SearchBar({
  placeholder = "Rechercher des services, livraisons...",
  value = "",
  onChange,
  onSubmit,
  suggestions,
  className,
}: SearchBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Charger les recherches récentes depuis localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ecodeli-recent-searches");
      if (saved) {
        try {
          setRecentSearches(JSON.parse(saved));
        } catch (e) {
          console.error(
            "Erreur lors du chargement des recherches récentes:",
            e,
          );
        }
      }
    }
  }, []);

  // Sauvegarder les recherches récentes
  const saveRecentSearch = (search: string) => {
    if (search.trim() && typeof window !== "undefined") {
      const updated = [
        search,
        ...recentSearches.filter((s) => s !== search),
      ].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem("ecodeli-recent-searches", JSON.stringify(updated));
    }
  };

  // Gérer les changements de valeur
  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    onChange(newValue);
  };

  // Gérer la soumission
  const handleSubmit = (searchValue?: string) => {
    const finalValue = searchValue || inputValue;
    if (finalValue.trim()) {
      saveRecentSearch(finalValue.trim());
      onSubmit?.(finalValue.trim());
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  // Gérer les touches clavier
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  // Gérer les clics extérieurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtrer les suggestions
  const filteredSuggestions = (suggestions || defaultSuggestions).filter(
    (suggestion) =>
      !inputValue ||
      suggestion.text.toLowerCase().includes(inputValue.toLowerCase()),
  );

  // Combiner les recherches récentes avec les suggestions
  const allSuggestions = [
    ...recentSearches.map((search) => ({
      id: `recent-${search}`,
      text: search,
      type: "recent" as const,
    })),
    ...filteredSuggestions,
  ].slice(0, 8);

  const getSuggestionIcon = (type: SearchSuggestion["type"]) => {
    switch (type) {
      case "recent":
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case "trending":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "location":
        return <MapPin className="h-4 w-4 text-blue-500" />;
      default:
        return <Search className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem("ecodeli-recent-searches");
    }
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Input principal */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            "w-full pl-10 pr-10 py-2.5 bg-background border border-border rounded-lg",
            "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
            "placeholder:text-muted-foreground transition-colors",
          )}
        />

        {inputValue && (
          <button
            onClick={() => handleInputChange("")}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-muted rounded-md transition-colors"
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Dropdown des suggestions */}
      {isOpen && (
        <div className="absolute top-full mt-1 w-full bg-background border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          {allSuggestions.length > 0 ? (
            <div className="py-2">
              {/* Recherches récentes */}
              {recentSearches.length > 0 && (
                <>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Recherches récentes
                    </span>
                    <button
                      onClick={clearRecentSearches}
                      className="text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                      Effacer
                    </button>
                  </div>

                  {recentSearches.slice(0, 3).map((search) => (
                    <button
                      key={`recent-${search}`}
                      onClick={() => handleSubmit(search)}
                      className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-muted transition-colors text-left"
                    >
                      <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="flex-1 text-sm text-foreground">
                        {search}
                      </span>
                    </button>
                  ))}

                  {filteredSuggestions.length > 0 && (
                    <div className="border-t border-border my-2" />
                  )}
                </>
              )}

              {/* Suggestions */}
              {filteredSuggestions.length > 0 && (
                <>
                  <div className="px-3 py-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Suggestions
                    </span>
                  </div>

                  {filteredSuggestions.slice(0, 5).map((suggestion) => (
                    <button
                      key={suggestion.id}
                      onClick={() => handleSubmit(suggestion.text)}
                      className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-muted transition-colors text-left"
                    >
                      {getSuggestionIcon(suggestion.type)}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-foreground">
                          {suggestion.text}
                        </span>
                        {suggestion.category && (
                          <span className="text-xs text-muted-foreground ml-2">
                            · {suggestion.category}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          ) : (
            <div className="px-3 py-8 text-center text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucune suggestion trouvée</p>
            </div>
          )}

          {/* Footer avec raccourcis */}
          <div className="border-t border-border p-3 bg-muted/50">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Tapez ↵ pour rechercher</span>
              <span>ESC pour fermer</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Version compacte pour les headers
 */
export function CompactSearchBar({
  placeholder = "Rechercher...",
  onSubmit,
  className,
}: {
  placeholder?: string;
  onSubmit?: (value: string) => void;
  className?: string;
}) {
  const [value, setValue] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSubmit = () => {
    if (value.trim()) {
      onSubmit?.(value.trim());
      setValue("");
      setIsExpanded(false);
    }
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={cn(
          "p-2 rounded-lg hover:bg-muted transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-primary/20",
          className,
        )}
        aria-label="Rechercher"
      >
        <Search className="h-5 w-5 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <div className="relative">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSubmit();
            } else if (e.key === "Escape") {
              setIsExpanded(false);
              setValue("");
            }
          }}
          placeholder={placeholder}
          className="pl-8 pr-3 py-1.5 w-64 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          autoFocus
        />
      </div>

      <button
        onClick={() => {
          setIsExpanded(false);
          setValue("");
        }}
        className="p-1 hover:bg-muted rounded transition-colors"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );
}
