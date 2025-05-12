import { useState, useMemo, useCallback } from "react";
import { debounce, groupByCategory, sanitizeInput } from "../utils/inventoryUtils";

export default function useSearch(items) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState("name");
  const [filterCondition, setFilterCondition] = useState("");
  const [filterLab, setFilterLab] = useState("");
  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      const history = JSON.parse(localStorage.getItem("searchHistory") || "[]");
      return Array.isArray(history) ? history : [];
    } catch {
      return [];
    }
  });

  // Filtered items
  const filteredItems = useMemo(() => {
    let filtered = items;

    // Apply search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((item) =>
        item[searchField]?.toLowerCase().includes(term)
      );
    }

    // Apply condition filter
    if (filterCondition) {
      filtered = filtered.filter(
        (item) => item.itemCondition === filterCondition
      );
    }

    // Apply lab filter
    if (filterLab) {
      filtered = filtered.filter((item) => item.lab === filterLab);
    }

    return filtered;
  }, [items, searchTerm, searchField, filterCondition, filterLab]);

  // Group by category
  const categoryGroups = useMemo(
    () => groupByCategory(filteredItems),
    [filteredItems]
  );

  // Fixed debounced search with proper dependency handling
  const debouncedSearch = useCallback(
    (value) => {
      const debouncedFn = debounce((val) => {
        setSearchTerm(sanitizeInput(val));
      }, 300);
      debouncedFn(value);
    },
    [] // Empty dependency array as we're creating the debounced function inside
  );

  // Handle search change
  const handleSearchChange = useCallback((e) => {
    const value = sanitizeInput(e.target.value);
    debouncedSearch(value);

    if (value.trim()) {
      setSearchHistory((prevHistory) => {
        const newHistory = [
          value,
          ...prevHistory.filter((item) => item !== value),
        ].slice(0, 10);
        localStorage.setItem("searchHistory", JSON.stringify(newHistory));
        return newHistory;
      });
    }
  }, [debouncedSearch]);

  return {
    searchTerm,
    searchField,
    filterCondition,
    filterLab,
    setSearchField,
    setFilterCondition,
    setFilterLab,
    handleSearchChange,
    filteredItems,
    categoryGroups,
    searchHistory,
  };
}