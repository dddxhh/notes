import { useState } from "react";
import { useSearch } from "../../hooks";
import SearchBar from "../shared/SearchBar";
import SearchFilterPanel from "../shared/SearchFilterPanel";
import SearchResultList from "../shared/SearchResultList";
import { useFoldersStore, useTagsStore } from "../../stores";

interface MobileSearchProps {
  onSelectNote?: (id: string) => void;
}

export default function MobileSearch({ onSelectNote }: MobileSearchProps) {
  const { searchInput, result, loading, updateFilter, clearSearch, executeSearch } = useSearch();
  const [showFilter, setShowFilter] = useState(false);
  const folders = useFoldersStore((s) => s.folders);
  const tags = useTagsStore((s) => s.tags);

  const handleSelectNote = (id: string) => {
    onSelectNote?.(id);
  };

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <div className="p-3 space-y-2">
        <h2 className="text-lg font-bold">搜索</h2>
        <SearchBar
          query={searchInput.query || ""}
          onQueryChange={(q) => updateFilter({ query: q })}
          showFilter={showFilter}
          onToggleFilter={() => setShowFilter(!showFilter)}
        />
      </div>

      {showFilter && (
        <div className="px-3">
          <SearchFilterPanel
            folders={folders}
            tags={tags}
            filter={searchInput}
            onFilterChange={updateFilter}
          />
        </div>
      )}

      <div className="flex-1 overflow-auto p-3">
        <SearchResultList
          result={result}
          loading={loading}
          onSelectNote={handleSelectNote}
          onLoadMore={() => {
            executeSearch({ ...searchInput, offset: (searchInput.offset || 0) + (searchInput.limit || 20) });
          }}
        />
      </div>
    </div>
  );
}