import { useState, useCallback, useMemo, useEffect } from 'react';

export interface BulkSelectionState<T extends { id: string }> {
  selectedIds: Set<string>;
  selectedItems: T[];
  isAllSelected: boolean;
  isPartialSelected: boolean;
  selectAll: () => void;
  deselectAll: () => void;
  toggleItem: (id: string) => void;
  toggleAll: () => void;
  selectItems: (ids: string[]) => void;
  isSelected: (id: string) => boolean;
  selectRange: (startId: string, endId: string) => void;
  count: number;
}

interface UseBulkSelectionOptions<T extends { id: string }> {
  data: T[];
  /** Function to check if an item can be selected */
  canSelect?: (item: T) => boolean;
  /** Persist selection across page navigation */
  persistSelection?: boolean;
}

export function useBulkSelection<T extends { id: string }>({
  data,
  canSelect = () => true,
  persistSelection = true,
}: UseBulkSelectionOptions<T>): BulkSelectionState<T> {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Get selectable items
  const selectableItems = useMemo(() => {
    return data.filter(canSelect);
  }, [data, canSelect]);

  const selectableIds = useMemo(() => {
    return new Set(selectableItems.map(item => item.id));
  }, [selectableItems]);

  // Clean up selection when data changes (if not persisting)
  useEffect(() => {
    if (!persistSelection) {
      setSelectedIds(prev => {
        const newSet = new Set<string>();
        prev.forEach(id => {
          if (selectableIds.has(id)) {
            newSet.add(id);
          }
        });
        return newSet;
      });
    }
  }, [selectableIds, persistSelection]);

  const selectedItems = useMemo(() => {
    return data.filter(item => selectedIds.has(item.id));
  }, [data, selectedIds]);

  const isAllSelected = useMemo(() => {
    if (selectableItems.length === 0) return false;
    return selectableItems.every(item => selectedIds.has(item.id));
  }, [selectableItems, selectedIds]);

  const isPartialSelected = useMemo(() => {
    if (selectableItems.length === 0) return false;
    const someSelected = selectableItems.some(item => selectedIds.has(item.id));
    return someSelected && !isAllSelected;
  }, [selectableItems, selectedIds, isAllSelected]);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(selectableItems.map(item => item.id)));
  }, [selectableItems]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const toggleItem = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else if (selectableIds.has(id)) {
        newSet.add(id);
      }
      return newSet;
    });
  }, [selectableIds]);

  const toggleAll = useCallback(() => {
    if (isAllSelected) {
      deselectAll();
    } else {
      selectAll();
    }
  }, [isAllSelected, selectAll, deselectAll]);

  const selectItems = useCallback((ids: string[]) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      ids.forEach(id => {
        if (selectableIds.has(id)) {
          newSet.add(id);
        }
      });
      return newSet;
    });
  }, [selectableIds]);

  const isSelected = useCallback((id: string) => {
    return selectedIds.has(id);
  }, [selectedIds]);

  const selectRange = useCallback((startId: string, endId: string) => {
    const dataIds = data.map(item => item.id);
    const startIndex = dataIds.indexOf(startId);
    const endIndex = dataIds.indexOf(endId);
    
    if (startIndex === -1 || endIndex === -1) return;
    
    const [minIndex, maxIndex] = [Math.min(startIndex, endIndex), Math.max(startIndex, endIndex)];
    const rangeIds = dataIds.slice(minIndex, maxIndex + 1).filter(id => selectableIds.has(id));
    
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      rangeIds.forEach(id => newSet.add(id));
      return newSet;
    });
  }, [data, selectableIds]);

  return {
    selectedIds,
    selectedItems,
    isAllSelected,
    isPartialSelected,
    selectAll,
    deselectAll,
    toggleItem,
    toggleAll,
    selectItems,
    isSelected,
    selectRange,
    count: selectedIds.size,
  };
}
