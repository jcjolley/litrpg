import { useState, useCallback, useEffect, useRef } from 'react';
import type { BookFilters, FilterState } from '../../api/books';
import { getAuthors, getNarrators, EMPTY_FILTERS, hasActiveFilters, getFilterValues } from '../../api/books';
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

// Filter options - Expanded genre taxonomy (alphabetically sorted)
const GENRES = [
  { value: 'Academy', label: 'ACADEMY' },
  { value: 'Base Building', label: 'BASE BUILDING' },
  { value: 'Comedy', label: 'COMEDY' },
  { value: 'Crafting', label: 'CRAFTING' },
  { value: 'Cultivation', label: 'CULTIVATION' },
  { value: 'Dark Fantasy', label: 'DARK FANTASY' },
  { value: 'Deck Building', label: 'DECK BUILDING' },
  { value: 'Dungeon Core', label: 'DUNGEON CORE' },
  { value: 'Dungeon Diving', label: 'DUNGEON DIVING' },
  { value: 'GameLit', label: 'GAMELIT' },
  { value: 'Harem', label: 'HAREM' },
  { value: 'Isekai', label: 'ISEKAI' },
  { value: 'Kingdom Building', label: 'KINGDOM BUILDING' },
  { value: 'LitRPG', label: 'LITRPG' },
  { value: 'Military', label: 'MILITARY' },
  { value: 'Monster Evolution', label: 'MONSTER EVOLUTION' },
  { value: 'Party-Based', label: 'PARTY-BASED' },
  { value: 'Portal Fantasy', label: 'PORTAL FANTASY' },
  { value: 'Post-Apocalyptic', label: 'POST-APOCALYPTIC' },
  { value: 'Progression Fantasy', label: 'PROGRESSION FANTASY' },
  { value: 'Regression', label: 'REGRESSION' },
  { value: 'Reincarnation', label: 'REINCARNATION' },
  { value: 'Slice of Life', label: 'SLICE OF LIFE' },
  { value: 'Solo Leveling', label: 'SOLO LEVELING' },
  { value: 'Summoner', label: 'SUMMONER' },
  { value: 'System Apocalypse', label: 'SYSTEM APOCALYPSE' },
  { value: 'Time Loop', label: 'TIME LOOP' },
  { value: 'Tower Climb', label: 'TOWER CLIMB' },
  { value: 'Virtual Reality', label: 'VIRTUAL REALITY' },
  { value: 'Wuxia', label: 'WUXIA' },
  { value: 'Xianxia', label: 'XIANXIA' },
  { value: '__uncategorized__', label: 'UNCATEGORIZED' },
];

const LENGTHS = [
  { value: 'Short', label: 'SHORT' },
  { value: 'Medium', label: 'MEDIUM' },
  { value: 'Long', label: 'LONG' },
  { value: 'Epic', label: 'EPIC' },
];

const POPULARITY = [
  { value: 'popular', label: 'POPULAR' },
  { value: 'niche', label: 'HIDDEN GEMS' },
];

const SOURCES = [
  { value: 'AUDIBLE', label: 'AUDIOBOOKS' },
  { value: 'ROYAL_ROAD', label: 'WEB FICTION' },
];

interface FilterMenuProps {
  filters: BookFilters;
  onFiltersChange: (filters: BookFilters) => void;
  popularityWeight: number;
  onPopularityWeightChange: (weight: number) => void;
  disabled?: boolean;
}

type FilterRow = 'source' | 'author' | 'narrator' | 'genre' | 'length' | 'popularity' | 'discovery';

// Cycle through filter states: neutral -> include -> exclude -> neutral
function cycleFilterState(current: FilterState | undefined): FilterState | undefined {
  switch (current) {
    case undefined:
    case 'neutral':
      return 'include';
    case 'include':
      return 'exclude';
    case 'exclude':
      return undefined; // Remove from object (neutral)
    default:
      return 'include';
  }
}

// Get display prefix for filter state
function getStatePrefix(state: FilterState | undefined): string {
  switch (state) {
    case 'include':
      return '+';
    case 'exclude':
      return '-';
    default:
      return '';
  }
}

export function FilterMenu({ filters, onFiltersChange, popularityWeight, onPopularityWeightChange, disabled }: FilterMenuProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeRow, setActiveRow] = useState<FilterRow>('genre');
  const [authors, setAuthors] = useState<string[]>([]);
  const [narrators, setNarrators] = useState<string[]>([]);
  const [authorSearch, setAuthorSearch] = useState('');
  const [narratorSearch, setNarratorSearch] = useState('');
  const [isLoadingAuthors, setIsLoadingAuthors] = useState(false);
  const [isLoadingNarrators, setIsLoadingNarrators] = useState(false);
  const initialLoadDone = useRef({ authors: false, narrators: false });
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

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

  // Slider handlers
  const calculateSliderValue = useCallback((clientX: number): number => {
    if (!sliderRef.current) return 0;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    // Map 0-1 to -1 to 1, snap to 0.5 increments
    const raw = percent * 2 - 1;
    return Math.round(raw * 2) / 2; // Snaps to -1, -0.5, 0, 0.5, 1
  }, []);

  const handleSliderMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    const value = calculateSliderValue(e.clientX);
    onPopularityWeightChange(value);
  }, [calculateSliderValue, onPopularityWeightChange]);

  const handleSliderTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true);
    const value = calculateSliderValue(e.touches[0].clientX);
    onPopularityWeightChange(value);
  }, [calculateSliderValue, onPopularityWeightChange]);

  // Global mouse/touch move and up handlers for slider
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const value = calculateSliderValue(e.clientX);
      onPopularityWeightChange(value);
    };

    const handleTouchMove = (e: TouchEvent) => {
      const value = calculateSliderValue(e.touches[0].clientX);
      onPopularityWeightChange(value);
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, calculateSliderValue, onPopularityWeightChange]);

  // Get slider display text
  const getSliderDisplayText = (): string => {
    if (popularityWeight <= -0.75) return 'DEEP CUTS';
    if (popularityWeight <= -0.25) return 'HIDDEN GEMS';
    if (popularityWeight < 0.25) return 'RANDOM';
    if (popularityWeight < 0.75) return 'CROWD FAVORITES';
    return 'TOP PICKS';
  };

  // Handle clicking on a filter option - cycle through states
  const handleOptionClick = useCallback((category: keyof BookFilters, value: string) => {
    const currentState = filters[category][value];
    const newState = cycleFilterState(currentState);

    const newCategoryFilters = { ...filters[category] };
    if (newState === undefined) {
      delete newCategoryFilters[value];
    } else {
      newCategoryFilters[value] = newState;
    }

    onFiltersChange({
      ...filters,
      [category]: newCategoryFilters,
    });
  }, [filters, onFiltersChange]);

  const handleClearAll = useCallback(() => {
    onFiltersChange(EMPTY_FILTERS);
  }, [onFiltersChange]);

  const handleRowClick = useCallback((row: FilterRow) => {
    setActiveRow(row);
  }, []);

  // Get style class for option based on its filter state
  const getOptionClass = (category: keyof BookFilters, value: string): string => {
    const state = filters[category][value];
    const classes = [styles.optionItem];

    if (state === 'include') {
      classes.push(styles.optionInclude);
    } else if (state === 'exclude') {
      classes.push(styles.optionExclude);
    }

    return classes.join(' ');
  };

  // Get display label with state prefix
  const getOptionLabel = (category: keyof BookFilters, value: string, label: string): string => {
    const prefix = getStatePrefix(filters[category][value]);
    return prefix ? `${prefix} ${label}` : label;
  };

  // Build summary text showing active filters
  const getSummaryText = () => {
    const parts: string[] = [];

    const addCategoryParts = (category: keyof BookFilters, labelMap?: Record<string, string>) => {
      const includes = getFilterValues(filters[category], 'include');
      const excludes = getFilterValues(filters[category], 'exclude');

      for (const value of includes) {
        const label = labelMap?.[value] || value;
        parts.push(`+${label}`);
      }
      for (const value of excludes) {
        const label = labelMap?.[value] || value;
        parts.push(`-${label}`);
      }
    };

    const sourceLabelMap: Record<string, string> = {
      'AUDIBLE': 'AUDIOBOOKS',
      'ROYAL_ROAD': 'WEB FICTION',
    };

    addCategoryParts('source', sourceLabelMap);
    addCategoryParts('author');
    addCategoryParts('narrator');
    addCategoryParts('genre');
    addCategoryParts('length');
    addCategoryParts('popularity', { 'popular': 'POPULAR', 'niche': 'HIDDEN GEMS' });

    return parts.length > 0 ? parts.join(' • ') : 'No filters';
  };

  // Check if category has any active filters
  const categoryHasFilters = (category: keyof BookFilters): boolean => {
    return Object.values(filters[category]).some(state => state === 'include' || state === 'exclude');
  };

  // Render option button
  const renderOption = (category: keyof BookFilters, value: string, label: string) => (
    <button
      key={value}
      className={getOptionClass(category, value)}
      onClick={() => handleOptionClick(category, value)}
    >
      {getOptionLabel(category, value, label)}
    </button>
  );

  return (
    <div className={`${styles.container} ${disabled ? styles.disabled : ''}`}>
      {/* Collapsed Header Bar */}
      <button
        className={styles.header}
        onClick={toggleExpanded}
        disabled={disabled}
        aria-expanded={isExpanded}
      >
        <span className={styles.headerIcon}>{isExpanded ? '▲' : '▼'}</span>
        <span className={styles.headerLabel}>FILTERS:</span>
        <span className={`${styles.headerValue} ${hasActiveFilters(filters) ? styles.active : ''}`}>
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
                className={`${styles.categoryRow} ${activeRow === 'source' ? styles.activeRow : ''} ${categoryHasFilters('source') ? styles.hasFilters : ''}`}
                onClick={() => handleRowClick('source')}
              >
                <span className={styles.cursor}>{activeRow === 'source' ? '▶' : ' '}</span>
                <span className={styles.categoryLabel}>SOURCE</span>
              </button>
              <button
                className={`${styles.categoryRow} ${activeRow === 'author' ? styles.activeRow : ''} ${categoryHasFilters('author') ? styles.hasFilters : ''}`}
                onClick={() => handleRowClick('author')}
              >
                <span className={styles.cursor}>{activeRow === 'author' ? '▶' : ' '}</span>
                <span className={styles.categoryLabel}>AUTHOR</span>
              </button>
              <button
                className={`${styles.categoryRow} ${activeRow === 'narrator' ? styles.activeRow : ''} ${categoryHasFilters('narrator') ? styles.hasFilters : ''}`}
                onClick={() => handleRowClick('narrator')}
              >
                <span className={styles.cursor}>{activeRow === 'narrator' ? '▶' : ' '}</span>
                <span className={styles.categoryLabel}>NARRATOR</span>
              </button>
              <button
                className={`${styles.categoryRow} ${activeRow === 'genre' ? styles.activeRow : ''} ${categoryHasFilters('genre') ? styles.hasFilters : ''}`}
                onClick={() => handleRowClick('genre')}
              >
                <span className={styles.cursor}>{activeRow === 'genre' ? '▶' : ' '}</span>
                <span className={styles.categoryLabel}>GENRE</span>
              </button>
              <button
                className={`${styles.categoryRow} ${activeRow === 'length' ? styles.activeRow : ''} ${categoryHasFilters('length') ? styles.hasFilters : ''}`}
                onClick={() => handleRowClick('length')}
              >
                <span className={styles.cursor}>{activeRow === 'length' ? '▶' : ' '}</span>
                <span className={styles.categoryLabel}>LENGTH</span>
              </button>
              <button
                className={`${styles.categoryRow} ${activeRow === 'popularity' ? styles.activeRow : ''} ${categoryHasFilters('popularity') ? styles.hasFilters : ''}`}
                onClick={() => handleRowClick('popularity')}
              >
                <span className={styles.cursor}>{activeRow === 'popularity' ? '▶' : ' '}</span>
                <span className={styles.categoryLabel}>POPULARITY</span>
              </button>
              <button
                className={`${styles.categoryRow} ${activeRow === 'discovery' ? styles.activeRow : ''} ${popularityWeight !== 0 ? styles.hasFilters : ''}`}
                onClick={() => handleRowClick('discovery')}
              >
                <span className={styles.cursor}>{activeRow === 'discovery' ? '▶' : ' '}</span>
                <span className={styles.categoryLabel}>DISCOVERY</span>
              </button>
            </div>

            {/* Divider */}
            <div className={styles.divider} />

            {/* Right side: Options for selected category */}
            <div className={styles.options}>
              {activeRow === 'source' && (
                <div className={styles.optionsList}>
                  {SOURCES.map(source => renderOption('source', source.value, source.label))}
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
                    {isLoadingAuthors ? (
                      <span className={styles.loading}>Loading...</span>
                    ) : (
                      authors.map(author => renderOption('author', author, author))
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
                    {isLoadingNarrators ? (
                      <span className={styles.loading}>Loading...</span>
                    ) : (
                      narrators.map(narrator => renderOption('narrator', narrator, narrator))
                    )}
                  </div>
                </div>
              )}
              {activeRow === 'genre' && (
                <div className={styles.optionsList}>
                  {GENRES.map(genre => renderOption('genre', genre.value, genre.label))}
                </div>
              )}
              {activeRow === 'length' && (
                <div className={styles.optionsList}>
                  {LENGTHS.map(length => renderOption('length', length.value, length.label))}
                </div>
              )}
              {activeRow === 'popularity' && (
                <div className={styles.optionsList}>
                  {POPULARITY.map(pop => renderOption('popularity', pop.value, pop.label))}
                </div>
              )}
              {activeRow === 'discovery' && (
                <div className={styles.sliderContainer}>
                  <div className={styles.sliderLabels}>
                    <span className={`${styles.sliderLabel} ${popularityWeight < -0.25 ? styles.active : ''}`}>
                      NICHE
                    </span>
                    <span className={`${styles.sliderLabel} ${popularityWeight >= -0.25 && popularityWeight <= 0.25 ? styles.active : ''}`}>
                      RANDOM
                    </span>
                    <span className={`${styles.sliderLabel} ${popularityWeight > 0.25 ? styles.active : ''}`}>
                      POPULAR
                    </span>
                  </div>
                  <div
                    ref={sliderRef}
                    className={styles.sliderTrack}
                    onMouseDown={handleSliderMouseDown}
                    onTouchStart={handleSliderTouchStart}
                  >
                    <div
                      className={styles.sliderThumb}
                      style={{ left: `${((popularityWeight + 1) / 2) * 100}%` }}
                    />
                  </div>
                  <div className={styles.sliderTicks}>
                    <div className={styles.sliderTick} />
                    <div className={styles.sliderTick} />
                    <div className={`${styles.sliderTick} ${styles.center}`} />
                    <div className={styles.sliderTick} />
                    <div className={styles.sliderTick} />
                  </div>
                  <div className={styles.sliderValue}>{getSliderDisplayText()}</div>
                  <div className={styles.sliderHint}>
                    Adjust to discover hidden gems or stick to proven favorites
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className={styles.actions}>
            <button
              className={`${styles.actionButton} ${styles.clearButton}`}
              onClick={handleClearAll}
              disabled={!hasActiveFilters(filters)}
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
