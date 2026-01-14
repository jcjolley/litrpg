import { useState, useCallback, useEffect, useRef } from 'react';
import type { BookFilters } from '../../api/books';
import { getAuthors, getNarrators } from '../../api/books';
import styles from './FilterMenu.module.css';

// Debounce hook for search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// Filter options
const GENRES = [
  { value: '', label: 'ALL' },
  { value: 'Cultivation', label: 'CULTIVATION' },
  { value: 'System Apocalypse', label: 'SYSTEM APOCALYPSE' },
  { value: 'Dungeon Core', label: 'DUNGEON CORE' },
  { value: 'Isekai', label: 'ISEKAI' },
  { value: 'Time Loop', label: 'TIME LOOP' },
  { value: 'Tower Climb', label: 'TOWER CLIMB' },
  { value: 'Academy', label: 'ACADEMY' },
  { value: 'GameLit', label: 'GAMELIT' },
];

const LENGTHS = [
  { value: '', label: 'ANY' },
  { value: 'Short', label: 'SHORT' },
  { value: 'Medium', label: 'MEDIUM' },
  { value: 'Long', label: 'LONG' },
  { value: 'Epic', label: 'EPIC' },
];

const POPULARITY = [
  { value: '', label: 'ANY' },
  { value: 'popular', label: 'POPULAR' },
  { value: 'niche', label: 'HIDDEN GEMS' },
];

const SOURCES = [
  { value: '', label: 'ALL' },
  { value: 'AUDIBLE', label: 'AUDIOBOOKS' },
  { value: 'ROYAL_ROAD', label: 'WEB FICTION' },
];

interface FilterMenuProps {
  filters: BookFilters;
  onFiltersChange: (filters: BookFilters) => void;
  disabled?: boolean;
}

type FilterRow = 'source' | 'author' | 'narrator' | 'genre' | 'length' | 'popularity';

export function FilterMenu({ filters, onFiltersChange, disabled }: FilterMenuProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeRow, setActiveRow] = useState<FilterRow>('genre');
  const [authors, setAuthors] = useState<string[]>([]);
  const [narrators, setNarrators] = useState<string[]>([]);
  const [authorSearch, setAuthorSearch] = useState('');
  const [narratorSearch, setNarratorSearch] = useState('');
  const [isLoadingAuthors, setIsLoadingAuthors] = useState(false);
  const [isLoadingNarrators, setIsLoadingNarrators] = useState(false);
  const initialLoadDone = useRef({ authors: false, narrators: false });

  // Debounce search terms (300ms delay)
  const debouncedAuthorSearch = useDebounce(authorSearch, 300);
  const debouncedNarratorSearch = useDebounce(narratorSearch, 300);

  // Fetch authors when search changes or on initial load
  useEffect(() => {
    if (!isExpanded || activeRow !== 'author') return;
    if (initialLoadDone.current.authors && !debouncedAuthorSearch) return;

    setIsLoadingAuthors(true);
    getAuthors(debouncedAuthorSearch || undefined)
      .then(setAuthors)
      .catch(console.error)
      .finally(() => {
        setIsLoadingAuthors(false);
        if (!debouncedAuthorSearch) initialLoadDone.current.authors = true;
      });
  }, [isExpanded, activeRow, debouncedAuthorSearch]);

  // Fetch narrators when search changes or on initial load
  useEffect(() => {
    if (!isExpanded || activeRow !== 'narrator') return;
    if (initialLoadDone.current.narrators && !debouncedNarratorSearch) return;

    setIsLoadingNarrators(true);
    getNarrators(debouncedNarratorSearch || undefined)
      .then(setNarrators)
      .catch(console.error)
      .finally(() => {
        setIsLoadingNarrators(false);
        if (!debouncedNarratorSearch) initialLoadDone.current.narrators = true;
      });
  }, [isExpanded, activeRow, debouncedNarratorSearch]);

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const handleFilterChange = useCallback((key: keyof BookFilters, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined, // Remove empty values
    });
  }, [filters, onFiltersChange]);

  const handleClearAll = useCallback(() => {
    onFiltersChange({});
  }, [onFiltersChange]);

  const handleRowClick = useCallback((row: FilterRow) => {
    setActiveRow(row);
  }, []);

  // Get display labels for current filters
  const getGenreLabel = () => {
    const genre = GENRES.find(g => g.value === filters.genre);
    return genre?.label || 'ALL';
  };

  const getLengthLabel = () => {
    const length = LENGTHS.find(l => l.value === filters.length);
    return length?.label || 'ANY';
  };

  const getPopularityLabel = () => {
    const pop = POPULARITY.find(p => p.value === filters.popularity);
    return pop?.label || 'ANY';
  };

  const getSourceLabel = () => {
    const source = SOURCES.find(s => s.value === filters.source);
    return source?.label || 'ALL';
  };

  const hasActiveFilters = filters.author || filters.narrator || filters.genre || filters.length || filters.popularity || filters.source;

  // Build summary text
  const getSummaryText = () => {
    const parts: string[] = [];
    if (filters.source) parts.push(getSourceLabel());
    if (filters.author) parts.push(filters.author);
    if (filters.narrator) parts.push(filters.narrator);
    if (filters.genre) parts.push(getGenreLabel());
    if (filters.length) parts.push(getLengthLabel());
    if (filters.popularity) parts.push(getPopularityLabel());
    return parts.length > 0 ? parts.join(' \u2022 ') : 'No filters';
  };

  return (
    <div className={`${styles.container} ${disabled ? styles.disabled : ''}`}>
      {/* Collapsed Header Bar */}
      <button
        className={styles.header}
        onClick={toggleExpanded}
        disabled={disabled}
        aria-expanded={isExpanded}
      >
        <span className={styles.headerIcon}>{isExpanded ? '\u25B2' : '\u25BC'}</span>
        <span className={styles.headerLabel}>FILTERS:</span>
        <span className={`${styles.headerValue} ${hasActiveFilters ? styles.active : ''}`}>
          {getSummaryText()}
        </span>
      </button>

      {/* Expanded Panel */}
      {isExpanded && (
        <div className={styles.panel}>
          <div className={styles.menuContainer}>
            {/* Left side: Filter categories */}
            <div className={styles.categories}>
              <button
                className={`${styles.categoryRow} ${activeRow === 'source' ? styles.activeRow : ''}`}
                onClick={() => handleRowClick('source')}
              >
                <span className={styles.cursor}>{activeRow === 'source' ? '\u25B6' : ' '}</span>
                <span className={styles.categoryLabel}>SOURCE</span>
              </button>
              <button
                className={`${styles.categoryRow} ${activeRow === 'author' ? styles.activeRow : ''}`}
                onClick={() => handleRowClick('author')}
              >
                <span className={styles.cursor}>{activeRow === 'author' ? '\u25B6' : ' '}</span>
                <span className={styles.categoryLabel}>AUTHOR</span>
              </button>
              <button
                className={`${styles.categoryRow} ${activeRow === 'narrator' ? styles.activeRow : ''}`}
                onClick={() => handleRowClick('narrator')}
              >
                <span className={styles.cursor}>{activeRow === 'narrator' ? '\u25B6' : ' '}</span>
                <span className={styles.categoryLabel}>NARRATOR</span>
              </button>
              <button
                className={`${styles.categoryRow} ${activeRow === 'genre' ? styles.activeRow : ''}`}
                onClick={() => handleRowClick('genre')}
              >
                <span className={styles.cursor}>{activeRow === 'genre' ? '\u25B6' : ' '}</span>
                <span className={styles.categoryLabel}>GENRE</span>
              </button>
              <button
                className={`${styles.categoryRow} ${activeRow === 'length' ? styles.activeRow : ''}`}
                onClick={() => handleRowClick('length')}
              >
                <span className={styles.cursor}>{activeRow === 'length' ? '\u25B6' : ' '}</span>
                <span className={styles.categoryLabel}>LENGTH</span>
              </button>
              <button
                className={`${styles.categoryRow} ${activeRow === 'popularity' ? styles.activeRow : ''}`}
                onClick={() => handleRowClick('popularity')}
              >
                <span className={styles.cursor}>{activeRow === 'popularity' ? '\u25B6' : ' '}</span>
                <span className={styles.categoryLabel}>POPULARITY</span>
              </button>
            </div>

            {/* Divider */}
            <div className={styles.divider} />

            {/* Right side: Options for selected category */}
            <div className={styles.options}>
              {activeRow === 'source' && (
                <div className={styles.optionsList}>
                  {SOURCES.map(source => (
                    <button
                      key={source.value}
                      className={`${styles.optionItem} ${filters.source === source.value || (!filters.source && source.value === '') ? styles.selected : ''}`}
                      onClick={() => handleFilterChange('source', source.value)}
                    >
                      {source.label}
                    </button>
                  ))}
                </div>
              )}
              {activeRow === 'author' && (
                <div className={styles.searchContainer}>
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Search authors..."
                    value={authorSearch}
                    onChange={(e) => setAuthorSearch(e.target.value)}
                  />
                  <div className={styles.optionsList}>
                    <button
                      className={`${styles.optionItem} ${!filters.author ? styles.selected : ''}`}
                      onClick={() => handleFilterChange('author', '')}
                    >
                      ALL AUTHORS
                    </button>
                    {isLoadingAuthors ? (
                      <span className={styles.loading}>Loading...</span>
                    ) : (
                      authors.map(author => (
                        <button
                          key={author}
                          className={`${styles.optionItem} ${filters.author === author ? styles.selected : ''}`}
                          onClick={() => handleFilterChange('author', author)}
                        >
                          {author}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
              {activeRow === 'narrator' && (
                <div className={styles.searchContainer}>
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Search narrators..."
                    value={narratorSearch}
                    onChange={(e) => setNarratorSearch(e.target.value)}
                  />
                  <div className={styles.optionsList}>
                    <button
                      className={`${styles.optionItem} ${!filters.narrator ? styles.selected : ''}`}
                      onClick={() => handleFilterChange('narrator', '')}
                    >
                      ALL NARRATORS
                    </button>
                    {isLoadingNarrators ? (
                      <span className={styles.loading}>Loading...</span>
                    ) : (
                      narrators.map(narrator => (
                        <button
                          key={narrator}
                          className={`${styles.optionItem} ${filters.narrator === narrator ? styles.selected : ''}`}
                          onClick={() => handleFilterChange('narrator', narrator)}
                        >
                          {narrator}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
              {activeRow === 'genre' && (
                <div className={styles.optionsList}>
                  {GENRES.map(genre => (
                    <button
                      key={genre.value}
                      className={`${styles.optionItem} ${filters.genre === genre.value || (!filters.genre && genre.value === '') ? styles.selected : ''}`}
                      onClick={() => handleFilterChange('genre', genre.value)}
                    >
                      {genre.label}
                    </button>
                  ))}
                </div>
              )}
              {activeRow === 'length' && (
                <div className={styles.optionsList}>
                  {LENGTHS.map(length => (
                    <button
                      key={length.value}
                      className={`${styles.optionItem} ${filters.length === length.value || (!filters.length && length.value === '') ? styles.selected : ''}`}
                      onClick={() => handleFilterChange('length', length.value)}
                    >
                      {length.label}
                    </button>
                  ))}
                </div>
              )}
              {activeRow === 'popularity' && (
                <div className={styles.optionsList}>
                  {POPULARITY.map(pop => (
                    <button
                      key={pop.value}
                      className={`${styles.optionItem} ${filters.popularity === pop.value || (!filters.popularity && pop.value === '') ? styles.selected : ''}`}
                      onClick={() => handleFilterChange('popularity', pop.value)}
                    >
                      {pop.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className={styles.actions}>
            <button
              className={`${styles.actionButton} ${styles.clearButton}`}
              onClick={handleClearAll}
              disabled={!hasActiveFilters}
            >
              CLEAR ALL
            </button>
            <button
              className={`${styles.actionButton} ${styles.applyButton}`}
              onClick={toggleExpanded}
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
