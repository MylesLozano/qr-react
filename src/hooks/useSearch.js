import { useState, useMemo, useCallback } from 'react';
import { debounce, groupByCategory, sanitizeInput } from '../utils/inventoryUtils';

export default function useSearch(items, selectedCategory, sortOrder) {
  // Added selectedCategory and sortOrder
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState('name');
  const [filterCondition, setFilterCondition] = useState('');
  const [filterLab, setFilterLab] = useState('');
  const [filterStatus, setFilterStatus] = useState(''); // Added filterStatus state
  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
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
      filtered = filtered.filter((item) => item[searchField]?.toLowerCase().includes(term));
    }

    // Apply condition filter
    if (filterCondition) {
      filtered = filtered.filter((item) => item.itemCondition === filterCondition);
    }

    // Apply status filter
    if (filterStatus) {
      filtered = filtered.filter((item) => item.status === filterStatus);
    }

    // Apply lab filter
    if (filterLab) {
      filtered = filtered.filter((item) => item.lab === filterLab);
    }

    // Apply category filter if a category is selected
    if (selectedCategory) {
      filtered = filtered.filter((item) => item.category === selectedCategory);
    }

    // Apply sorting
    if (sortOrder === 'unitNumber_asc') {
      filtered = [...filtered].sort((a, b) => {
        // Assuming unitNumber can be numeric or alphanumeric, provide a robust sort
        const numA = parseFloat(a.unitNumber);
        const numB = parseFloat(b.unitNumber);
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
        // Fallback to string comparison if not purely numeric
        return String(a.unitNumber).localeCompare(String(b.unitNumber), undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      });
    } else if (sortOrder === 'unitNumber_desc') {
      filtered = [...filtered].sort((a, b) => {
        const numA = parseFloat(a.unitNumber);
        const numB = parseFloat(b.unitNumber);
        if (!isNaN(numA) && !isNaN(numB)) {
          return numB - numA;
        }
        return String(b.unitNumber).localeCompare(String(a.unitNumber), undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      });
    }

    return filtered;
  }, [
    items,
    searchTerm,
    searchField,
    filterCondition,
    filterLab,
    filterStatus,
    selectedCategory,
    sortOrder,
  ]); // Added filterStatus and selectedCategory and sortOrder to dependencies

  // Extract unique conditions from all items (not just filtered ones)
  const uniqueConditions = useMemo(() => {
    if (!items || items.length === 0) {
      return [];
    }
    const conditions = new Set(items.map((item) => item.itemCondition).filter(Boolean)); // filter(Boolean) removes null/undefined
    return Array.from(conditions).sort(); // Sort for consistent order
  }, [items]);

  // Extract unique statuses from all items
  const uniqueStatuses = useMemo(() => {
    if (!items || items.length === 0) {
      return [];
    }
    const statuses = new Set(items.map((item) => item.status).filter(Boolean));
    return Array.from(statuses).sort();
  }, [items]);

  // Group by category
  const categoryGroups = useMemo(() => groupByCategory(filteredItems), [filteredItems]);

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
          localStorage.setItem('searchHistory', JSON.stringify(newHistory));
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
    filterStatus, // Expose filterStatus
    setSearchField,
    setFilterCondition,
    setFilterLab,
    setFilterStatus, // Expose setFilterStatus
    handleSearchChange,
    filteredItems,
    categoryGroups,
    searchHistory,
    uniqueConditions, // Expose unique conditions
    uniqueStatuses, // Expose unique statuses
  };
}
