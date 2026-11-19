"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Two small pagination tools used across the app:
 *  - usePaged + <TablePager>: numbered pages for admin tables.
 *  - useShowMore + <ShowMoreButton>: "Show more" for phone lists (thumb-friendly, no tiny page links).
 * Both reset to the first page when `resetKey` changes (a new search or filter).
 */

export function usePaged<T>(items: T[], pageSize = 10, resetKey = "") {
  const [state, setState] = useState({ page: 1, key: resetKey });
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(state.key === resetKey ? state.page : 1, pageCount);
  return {
    page,
    pageCount,
    pageSize,
    total: items.length,
    rows: items.slice((page - 1) * pageSize, page * pageSize),
    setPage: (next: number) => setState({ page: Math.min(Math.max(1, next), pageCount), key: resetKey }),
  };
}

export function useShowMore<T>(items: T[], step = 10, resetKey = "") {
  const [state, setState] = useState({ shown: step, key: resetKey });
  const shown = state.key === resetKey ? state.shown : step;
  return {
    rows: items.slice(0, shown),
    total: items.length,
    hasMore: shown < items.length,
    remaining: Math.max(0, items.length - shown),
    showMore: () => setState({ shown: shown + step, key: resetKey }),
  };
}

export function TablePager({
  page,
  pageCount,
  total,
  pageSize,
  onPage,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
}) {
  if (total <= pageSize) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2 text-sm">
      <p className="text-muted-foreground">
        Showing {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <ChevronLeft /> Prev
        </Button>
        <span className="text-xs text-muted-foreground">
          Page {page} of {pageCount}
        </span>
        <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => onPage(page + 1)} aria-label="Next page">
          Next <ChevronRight />
        </Button>
      </div>
    </nav>
  );
}

export function ShowMoreButton({ hasMore, remaining, onClick }: { hasMore: boolean; remaining: number; onClick: () => void }) {
  if (!hasMore) return null;
  return (
    <Button variant="outline" className="w-full" onClick={onClick}>
      Show more ({remaining} more)
    </Button>
  );
}
