import { useState, useEffect } from 'react';

const STORAGE_KEY = 'erp_sidebar_collapsed';

export function useSidebarCollapse() {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === 'true';
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  const toggle = () => setCollapsed((prev) => !prev);

  return { collapsed, setCollapsed, toggle };
}
