import { useState, useRef, useEffect } from 'react';
import type { KeyboardEvent } from 'react';
import './CustomSelect.css';

export interface CustomSelectOption {
  value: string;
  label: string;
}

export interface CustomSelectProps {
  value: string;
  options: CustomSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CustomSelect({ value, options, onChange, placeholder, disabled = false }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  // Handle click outside to close
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Ensure highlighted item is visible when keyboard navigating
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listboxRef.current) {
      const optionEl = listboxRef.current.children[highlightedIndex] as HTMLElement;
      if (optionEl) {
        // simple scrollIntoView for accessibility
        optionEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
    if (!isOpen) {
      // Find index of currently selected item to highlight it
      const currentIndex = options.findIndex(opt => opt.value === value);
      setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0);
    }
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isOpen) {
          if (highlightedIndex >= 0) {
            handleSelect(options[highlightedIndex].value);
          }
        } else {
          handleToggle();
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          handleToggle();
        } else {
          setHighlightedIndex(prev => (prev < options.length - 1 ? prev + 1 : prev));
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!isOpen) {
          handleToggle();
        } else {
          setHighlightedIndex(prev => (prev > 0 ? prev - 1 : prev));
        }
        break;
      case 'Tab':
        // Let natural tab order happen, but close dropdown if open
        if (isOpen) {
          setIsOpen(false);
        }
        break;
    }
  };

  return (
    <div 
      className={`custom-select ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
      ref={containerRef}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
      role="combobox"
      aria-expanded={isOpen}
      aria-haspopup="listbox"
      aria-controls="custom-select-listbox"
    >
      <div 
        className="custom-select-trigger" 
        onClick={handleToggle}
      >
        <span className="custom-select-value">
          {selectedOption ? selectedOption.label : (placeholder || 'Select...')}
        </span>
        <svg 
          className={`custom-select-chevron ${isOpen ? 'open' : ''}`} 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>

      {isOpen && (
        <ul 
          className="custom-select-dropdown hide-scrollbar" 
          role="listbox" 
          id="custom-select-listbox"
          ref={listboxRef}
        >
          {options.map((opt, index) => {
            const isSelected = opt.value === value;
            const isHighlighted = index === highlightedIndex;

            return (
              <li
                key={opt.value}
                className={`custom-select-option ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}`}
                role="option"
                aria-selected={isSelected}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(opt.value);
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                {opt.label}
                {isSelected && (
                  <svg className="custom-select-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
