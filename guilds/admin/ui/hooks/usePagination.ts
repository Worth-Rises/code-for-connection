import { useState, useCallback } from 'react';

export function usePagination(initialPageSize = 20) {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(initialPageSize);
  const [totalPages, setTotalPages] = useState(1);

  const nextPage = useCallback(() => {
    setPage((p) => Math.min(p + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setPage((p) => Math.max(p - 1, 1));
  }, []);

  const goToPage = useCallback(
    (target: number) => {
      setPage(Math.max(1, Math.min(target, totalPages)));
    },
    [totalPages]
  );

  return { page, pageSize, totalPages, setTotalPages, nextPage, prevPage, goToPage };
}
