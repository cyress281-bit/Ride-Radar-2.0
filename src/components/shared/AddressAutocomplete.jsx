import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils.js';
import { useAddressAutocomplete } from '@/hooks/use-address-autocomplete.js';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/primitives/Text';

/**
 * Address autocomplete input with dark glassmorphism dropdown.
 * Designed for Plan a Meetup / Event creation only.
 *
 * @param {object} props
 * @param {string} props.value - Current input value
 * @param {(value: string, coords?: {lat: number, lng: number}) => void} props.onSelect - Called when user selects a suggestion or types manually
 * @param {string} [props.placeholder] - Input placeholder
 * @param {boolean} [props.disabled] - Disable input
 * @param {string} [props.className] - Additional classes for input
 * @param {string} [props.inputId] - HTML id for the input
 * @param {string} [props.label] - Accessible label
 * @param {string} [props.error] - Validation error message
 * @param {string} [props.typeStyleInput] - Type-specific input styling class
 */
const AddressAutocomplete = memo(function AddressAutocomplete({
  value,
  onSelect,
  placeholder = 'Enter a location',
  disabled = false,
  className,
  inputId,
  label,
  error: validationError,
  typeStyleInput,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [hasSelected, setHasSelected] = useState(false);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const containerRef = useRef(null);

  const { suggestions, isLoading, error, isEmpty } = useAddressAutocomplete({
    query: value,
    enabled: isOpen && !hasSelected,
    debounceMs: 300,
    minLength: 3,
  });

  // Reset selection state when value changes externally
  useEffect(() => {
    if (!value) {
      setHasSelected(false);
    }
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = useCallback(
    (e) => {
      const next = e.target.value;
      setHasSelected(false);
      onSelect(next);
      setIsOpen(true);
      setHighlightedIndex(-1);
    },
    [onSelect]
  );

  const handleSelectSuggestion = useCallback(
    (suggestion) => {
      setHasSelected(true);
      setIsOpen(false);
      setHighlightedIndex(-1);
      onSelect(suggestion.displayName, { lat: suggestion.lat, lng: suggestion.lng });
      // Dismiss mobile keyboard
      inputRef.current?.blur();
    },
    [onSelect]
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
            handleSelectSuggestion(suggestions[highlightedIndex]);
          } else {
            setIsOpen(false);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setHighlightedIndex(-1);
          break;
      }
    },
    [isOpen, suggestions, highlightedIndex, handleSelectSuggestion]
  );

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex];
      if (item) {
        item.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  const showDropdown = isOpen && (isLoading || suggestions.length > 0 || isEmpty || error);

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label htmlFor={inputId} className="rr-kicker text-muted-foreground mb-1 block">
          {label}
        </label>
      )}
      <div className="relative">
        <Input
          ref={inputRef}
          id={inputId}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => {
            if (value.trim().length >= 3) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-controls={showDropdown ? `${inputId}-listbox` : undefined}
          aria-activedescendant={
            highlightedIndex >= 0 ? `${inputId}-option-${highlightedIndex}` : undefined
          }
          className={cn(
            'rr-premium-input rounded-[18px] pr-10',
            typeStyleInput,
            className
          )}
        />
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
          ) : (
            <MapPin className="h-4 w-4 text-muted-foreground/50" aria-hidden="true" />
          )}
        </div>
      </div>

      {validationError && (
        <p className="mt-1 text-xs text-destructive">{validationError}</p>
      )}

      {showDropdown && (
        <div
          id={`${inputId}-listbox`}
          ref={listRef}
          role="listbox"
          className={cn(
            'absolute left-0 right-0 top-full z-50 mt-1.5',
            'max-h-[240px] overflow-y-auto overscroll-contain',
            'rounded-[16px] border border-white/[0.08]',
            'bg-surface/95 backdrop-blur-xl',
            'shadow-[0_18px_54px_hsl(0_0%_0%/0.36)]',
            'py-1.5'
          )}
        >
          {isLoading && suggestions.length === 0 && (
            <div className="flex items-center gap-2 px-3.5 py-3 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              <Text variant="caption">Searching…</Text>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 px-3.5 py-3 text-alert">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <Text variant="caption">
                Search unavailable — type your address manually
              </Text>
            </div>
          )}

          {isEmpty && !error && (
            <div className="px-3.5 py-3 text-muted-foreground">
              <Text variant="caption">No matches — try a city or landmark</Text>
            </div>
          )}

          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.id}
              id={`${inputId}-option-${index}`}
              role="option"
              aria-selected={index === highlightedIndex}
              onClick={() => handleSelectSuggestion(suggestion)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={cn(
                'flex min-h-[44px] cursor-pointer items-center gap-2 px-3.5 py-2.5 transition-colors',
                index === highlightedIndex
                  ? 'bg-primary/10'
                  : 'hover:bg-white/[0.05]'
              )}
            >
              <MapPin
                className={cn(
                  'h-3.5 w-3.5 shrink-0',
                  index === highlightedIndex ? 'text-primary' : 'text-muted-foreground/60'
                )}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <Text
                  variant="bodySm"
                  className={cn(
                    'truncate font-medium',
                    index === highlightedIndex ? 'text-foreground' : 'text-foreground/90'
                  )}
                >
                  {suggestion.displayName}
                </Text>
                {suggestion.context && (
                  <Text variant="micro" color="muted" className="truncate">
                    {suggestion.context}
                  </Text>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default AddressAutocomplete;
