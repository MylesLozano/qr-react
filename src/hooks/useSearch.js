import { useState, useEffect, useMemo, useCallback } from "react";
import { debounce, groupByCategory } from "../utils/inventoryUtils";
import { sanitizeInput } from "../utils/inventoryUtils";

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

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((value) => {
      setSearchTerm(value);
    }, 300),
    []
  );

  // Handle search change
  const handleSearchChange = (e) => {
    const value = sanitizeInput(e.target.value);
    debouncedSearch(value);

    if (value.trim()) {
      const newHistory = [
        value,
        ...searchHistory.filter((item) => item !== value),
      ].slice(0, 10);
      setSearchHistory(newHistory);
      localStorage.setItem("searchHistory", JSON.stringify(newHistory));
    }
  };

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
