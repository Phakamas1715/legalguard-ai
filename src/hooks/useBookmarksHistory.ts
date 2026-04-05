import { useLocalStorage } from "./useLocalStorage";
import type { SearchResult } from "@/components/ResultCard";

export interface SearchHistoryItem {
  id: string;
  query: string;
  filters: { courtType: string; year: string; statute: string };
  resultCount: number;
  timestamp: number;
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useLocalStorage<SearchResult[]>("lg-bookmarks", []);

  const addBookmark = (result: SearchResult) => {
    setBookmarks((prev) => {
      if (prev.some((b) => b.id === result.id)) return prev;
      return [result, ...prev];
    });
  };

  const removeBookmark = (id: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  };

  const isBookmarked = (id: string) => bookmarks.some((b) => b.id === id);

  const toggleBookmark = (result: SearchResult) => {
    if (isBookmarked(result.id)) removeBookmark(result.id);
    else addBookmark(result);
  };

  return { bookmarks, addBookmark, removeBookmark, isBookmarked, toggleBookmark };
}

export function useSearchHistory() {
  const [history, setHistory] = useLocalStorage<SearchHistoryItem[]>("lg-history", []);

  const addHistory = (query: string, filters: { courtType: string; year: string; statute: string }, resultCount: number) => {
    const item: SearchHistoryItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      query,
      filters,
      resultCount,
      timestamp: Date.now(),
    };
    setHistory((prev) => [item, ...prev.slice(0, 49)]); // keep last 50
  };

  const clearHistory = () => setHistory([]);

  const removeHistoryItem = (id: string) => {
    setHistory((prev) => prev.filter((h) => h.id !== id));
  };

  return { history, addHistory, clearHistory, removeHistoryItem };
}
