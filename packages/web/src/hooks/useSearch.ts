import { useState, useCallback } from "react";
import { getStorage } from "../lib/sqlite-init";
import type { SearchInput, SearchResult } from "@notes/core";

export function useSearch() {
  const [searchInput, setSearchInput] = useState<SearchInput>({});
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  const executeSearch = useCallback(async (input: SearchInput) => {
    setLoading(true);
    try {
      const storage = getStorage();
      const searchResult = await storage.searchNotes(input);
      setResult(searchResult);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateFilter = useCallback((partial: Partial<SearchInput>) => {
    const newInput = { ...searchInput, ...partial };
    setSearchInput(newInput);
    if (newInput.query || newInput.folderId || newInput.tagIds?.length || newInput.type || newInput.hasAttachment || newInput.dateRange) {
      executeSearch(newInput);
    } else {
      setResult(null);
    }
  }, [searchInput, executeSearch]);

  const clearSearch = useCallback(() => {
    setSearchInput({});
    setResult(null);
  }, []);

  return { searchInput, result, loading, executeSearch, updateFilter, clearSearch };
}