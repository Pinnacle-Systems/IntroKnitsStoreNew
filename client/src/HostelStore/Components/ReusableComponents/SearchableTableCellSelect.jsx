import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { FaChevronDown } from "react-icons/fa";
import Modal from "../../../UiComponents/Modal";

const normalize = (value) => String(value ?? "").toLowerCase().trim();

const getOptionLabel = (option) => option?.label ?? option?.show ?? option?.name ?? String(option?.value ?? "");

const RequiredLabel = ({ name }) => (
  <span className="inline-block">
    {`${name}`}
    <span className="text-red-500">*</span>{" "}
  </span>
);

const SearchableTableCellSelect = forwardRef(({
  name,
  value,
  setValue,
  options = [],
  onChange,
  disabled = false,
  readOnly = false,
  required = false,
  align = "left",
  placeholder = "Select",
  childComponent = null,
  addNewLabel = "+ Add New",
  addNewModalWidth = "w-[40%] h-[45%]",
  movedToNextSaveNewRef,
  handlers,
  className = "",
  width = "full",
}, ref) => {
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const isDisabled = disabled || readOnly;

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    }
  }));
  const listRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-2);
  const [showAddNew, setShowAddNew] = useState(false);
  const [openUp, setOpenUp] = useState(false);

  const normalizedOptions = useMemo(() => {
    return (options || []).map((opt) => ({
      ...opt,
      _label: getOptionLabel(opt),
    }));
  }, [options]);

  const selectedOption = useMemo(
    () => normalizedOptions.find((option) => String(option.value) === String(value)),
    [normalizedOptions, value]
  );

  const filteredOptions = useMemo(() => {
    if (!isSearching && isOpen) return normalizedOptions;
    const query = normalize(search);
    if (!query) return normalizedOptions;

    const queryWords = query.split(/\s+/).filter(Boolean);

    return normalizedOptions
      .map((option) => {
        const label = normalize(option._label);
        let score = 0;
        const matchesAllWords = queryWords.every((word) => label.includes(word));

        if (matchesAllWords) {
          if (label.startsWith(query)) {
            score = 3;
          } else if (label.includes(query)) {
            score = 2;
          } else {
            score = 1;
          }
        }

        return { ...option, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [normalizedOptions, search, isSearching, isOpen]);

  const handleBlur = (event) => {
    if (containerRef.current && !containerRef.current.contains(event.relatedTarget)) {
      closeDropdown();
    }
  };

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = 200;

      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
        setOpenUp(true);
      } else {
        setOpenUp(false);
      }
    }
  }, [isOpen]);

  const closeDropdown = () => {
    setIsOpen(false);
    setIsSearching(false);
    setSearch("");
    setHighlightedIndex(-2);
  };

  const commitSelection = (nextValue) => {
    if (setValue) setValue(nextValue);
    if (onChange) onChange(nextValue);
    closeDropdown();

    setTimeout(() => {
      const allFocusable = Array.from(document.querySelectorAll('input:not([disabled]):not([readonly]), select:not([disabled]), button:not([disabled])'));
      const externalFocusable = allFocusable.filter(el => !containerRef.current?.contains(el) || el === inputRef.current);

      const index = externalFocusable.indexOf(inputRef.current);
      if (index > -1 && index < externalFocusable.length - 1) {
        externalFocusable[index + 1].focus();
      }
    }, 0);
  };

  const handleAddNewSuccess = (newValue) => {
    if (setValue) setValue(newValue);
    if (onChange) onChange(newValue);
    setShowAddNew(false);
    closeDropdown();
  };

  useEffect(() => {
    if (search.trim() !== "" && filteredOptions.length > 0) {
      setHighlightedIndex(0);
    } else if (isOpen && (value !== undefined && value !== null && value !== "") && !isSearching) {
      const index = normalizedOptions.findIndex((option) => String(option.value) === String(value));
      if (index !== -1) {
        setHighlightedIndex(index);
        const timeoutId = setTimeout(() => scrollIntoView(index), 50);
        return () => clearTimeout(timeoutId);
      } else {
        setHighlightedIndex(-2);
      }
    } else {
      setHighlightedIndex(-2);
    }
  }, [search, filteredOptions, value, normalizedOptions, isOpen, isSearching]);

  const scrollIntoView = (index) => {
    if (!listRef.current) return;
    const domIndex = childComponent ? index + 1 : index;
    const item = listRef.current.children[domIndex];
    if (item) item.scrollIntoView({ block: "nearest" });
  };

  const displayValue = (isOpen && isSearching) ? search : selectedOption?._label || "";

  const isFormLayout = Boolean(name);

  return (
    <div
      ref={containerRef}
      className={isFormLayout ? `relative mb-1 ${width === "full" ? "w-full" : width}` : "relative h-full w-full"}
      onBlur={handleBlur}
    >
      {name && (
        <label className="block text-[11px] font-bold text-slate-700 mb-1">
          {required ? <RequiredLabel name={name} /> : name}
        </label>
      )}

      <div
        className={
          isFormLayout
            ? `relative flex h-7 w-full items-center justify-between border border-gray-300 rounded-lg px-3 py-0 text-left
              ${isDisabled ? "bg-slate-100 cursor-not-allowed" : "bg-white cursor-pointer"}
              focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500
              transition-all duration-150 shadow-sm ${className}`
            : "relative h-full w-full"
        }
      >
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          placeholder={placeholder}
          disabled={isDisabled}
          className={
            isFormLayout
              ? `h-full w-full border-0 bg-transparent py-0 text-[11px] text-gray-800 shadow-none outline-none placeholder:text-gray-400 ${
                  align === "right" ? "text-right" : "text-left"
                }`
              : `h-full w-full border-0 bg-transparent py-0 text-[11px] shadow-none outline-none focus:bg-transparent focus:outline-none tx-table-input ${
                  align === "right" ? "text-right" : "text-left"
                }`
          }
          onFocus={(event) => {
            if (isDisabled) return;
            if (!isOpen) {
              setIsOpen(true);
              setIsSearching(false);
              setSearch("");
            }
            requestAnimationFrame(() => event.target.select());
          }}
          onMouseDown={(event) => {
            if (isDisabled) return;
            if (isOpen) {
              event.preventDefault();
              event.stopPropagation();
              closeDropdown();
            } else if (document.activeElement === event.target) {
              event.preventDefault();
              event.stopPropagation();
              setIsOpen(true);
              setIsSearching(false);
              setSearch("");
            }
          }}
          onChange={(event) => {
            if (isDisabled) return;
            setIsOpen(true);
            setIsSearching(true);
            setSearch(String(event.target.value ?? "").toUpperCase());
          }}
          onKeyDown={(event) => {
            if (isDisabled) return;

            if (event.key === "Escape") {
              closeDropdown();
              return;
            }

            if (event.key === "Delete") {
              event.preventDefault();
              commitSelection("");
              return;
            }

            if (event.key === "Enter") {
              const maxIdx = filteredOptions.length - 1;

              if (highlightedIndex === -1 && childComponent) {
                event.preventDefault();
                event.stopPropagation();
                setIsOpen(false);
                setSearch("");
                setShowAddNew(true);
                return;
              }

              if (highlightedIndex >= 0 && highlightedIndex <= maxIdx) {
                event.preventDefault();
                commitSelection(filteredOptions[highlightedIndex].value);
                return;
              }

              if (isOpen && isSearching && search.trim() === "") {
                event.preventDefault();
                event.stopPropagation();
                commitSelection("");
                setIsOpen(false);
                setSearch("");
                return;
              }

              event.preventDefault();
              event.stopPropagation();
              setIsOpen((prev) => !prev);
              if (isOpen) setSearch("");
              return;
            }

            if (event.key === "ArrowDown") {
              event.preventDefault();
              const minIdx = childComponent ? -1 : 0;
              const maxIdx = filteredOptions.length - 1;

              if (maxIdx < minIdx) return;

              if (!isOpen) {
                setIsOpen(true);
                return;
              }

              setHighlightedIndex((prev) => {
                const startIdx = prev === -2 ? minIdx - 1 : prev;
                const next = startIdx < maxIdx ? startIdx + 1 : minIdx;
                scrollIntoView(next);
                return next;
              });
              return;
            }

            if (event.key === "ArrowUp") {
              event.preventDefault();
              const minIdx = childComponent ? -1 : 0;
              const maxIdx = filteredOptions.length - 1;

              if (maxIdx < minIdx) return;

              if (!isOpen) {
                setIsOpen(true);
                return;
              }

              setHighlightedIndex((prev) => {
                const next = (prev > minIdx && prev !== -2) ? prev - 1 : maxIdx;
                scrollIntoView(next);
                return next;
              });
              return;
            }

            if (event.key === "Tab" && movedToNextSaveNewRef) {
              setIsOpen(false);
              event.preventDefault();
              handlers?.handleTabKeyDown(event);
            }
          }}
        />

        <FaChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500" />

        {isOpen && !isDisabled && (
          <div
            ref={listRef}
            className={`absolute left-0 z-50 max-h-48 min-w-full w-max max-w-[300px] overflow-auto border border-slate-300 rounded-lg bg-white shadow-lg ${
              openUp ? "bottom-[calc(100%+4px)]" : "top-[calc(100%+4px)]"
            }`}
          >
            {childComponent && (
              <button
                type="button"
                className={`block w-full border-b border-slate-100 px-3 py-1.5 text-left text-[11px] font-semibold text-blue-600 ${
                  highlightedIndex === -1 ? 'bg-blue-50' : 'hover:bg-blue-50'
                }`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  setIsOpen(false);
                  setSearch("");
                  setShowAddNew(true);
                }}
                onMouseEnter={() => setHighlightedIndex(-1)}
              >
                {addNewLabel}
              </button>
            )}

            {filteredOptions.length > 0 ? (
              filteredOptions?.map((option, index) => (
                <button
                  ref={handlers?.secondInputRef}
                  key={option.value}
                  type="button"
                  className={`block w-full border-b border-slate-100 px-3 py-1.5 text-left text-[11px] transition-colors ${
                    index === highlightedIndex
                      ? "bg-blue-600 text-white"
                      : String(option.value) === String(value)
                        ? "bg-blue-50 font-medium text-blue-600"
                        : "text-slate-700 hover:bg-slate-50"
                  }`}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    commitSelection(option.value);
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  {option._label}
                </button>
              ))
            ) : (
              <div className="px-3 py-1.5 text-[11px] text-slate-500 italic">No matches</div>
            )}
          </div>
        )}
      </div>

      {showAddNew && childComponent && (() => {
        const AddNew = childComponent;
        return (
          <Modal isOpen={showAddNew} onClose={() => setShowAddNew(false)} widthClass={addNewModalWidth}>
            <AddNew onSuccess={handleAddNewSuccess} onClose={() => setShowAddNew(false)} />
          </Modal>
        );
      })()}
    </div>
  );
});

export default SearchableTableCellSelect;
