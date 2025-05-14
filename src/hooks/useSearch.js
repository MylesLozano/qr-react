import { useState, useMemo, useCallback } from "react";
import {
  debounce,
  groupByCategory,
  sanitizeInput,
} from "../utils/inventoryUtils";

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

  // Memoized debounced function to update the search term
  const memoizedDebouncedSetSearchTerm = useMemo(() => {
    return debounce((newSearchTerm) => {
      setSearchTerm(newSearchTerm);
    }, 300);
  }, []); // setSearchTerm is stable, debounce is from utils.

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

  // Handle search change
  const handleSearchChange = useCallback(
    (e) => {
      const sanitizedValue = sanitizeInput(e.target.value); // Sanitize input once
      memoizedDebouncedSetSearchTerm(sanitizedValue); // Call the memoized debounced function

      if (sanitizedValue.trim()) {
        setSearchHistory((prevHistory) => {
          const newHistory = [
            sanitizedValue,
            ...prevHistory.filter((item) => item !== sanitizedValue),
          ].slice(0, 10);
          localStorage.setItem("searchHistory", JSON.stringify(newHistory));
          return newHistory;
        });
      }
    },
    [memoizedDebouncedSetSearchTerm]
  ); // sanitizeInput is an import, assumed stable.

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
