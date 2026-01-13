import { useState, useCallback } from 'react';
import type { BookFilters } from '../../api/books';
import styles from './FilterMenu.module.css';

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

interface FilterMenuProps {
  filters: BookFilters;
  onFiltersChange: (filters: BookFilters) => void;
  disabled?: boolean;
}

type FilterRow = 'genre' | 'length' | 'popularity';

export function FilterMenu({ filters, onFiltersChange, disabled }: FilterMenuProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeRow, setActiveRow] = useState<FilterRow>('genre');

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

  const hasActiveFilters = filters.genre || filters.length || filters.popularity;

  // Build summary text
  const getSummaryText = () => {
    const parts: string[] = [];
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
