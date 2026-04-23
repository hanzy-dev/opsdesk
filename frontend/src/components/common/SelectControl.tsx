import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AppIcon } from "./AppIcon";

export type SelectOption<T extends string = string> = {
  value: T;
  label: string;
  description?: string;
  disabled?: boolean;
};

type SelectControlProps<T extends string = string> = {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  id?: string;
  disabled?: boolean;
  placeholder?: string;
  ariaLabel?: string;
};

export function SelectControl<T extends string>({
  value,
  onChange,
  options,
  id,
  disabled = false,
  placeholder,
  ariaLabel,
}: SelectControlProps<T>) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const listboxId = `${controlId}-listbox`;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const wasOpenRef = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() => getInitialIndex(options, value));

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  useEffect(() => {
    setActiveIndex(getInitialIndex(options, value));
  }, [options, value]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || activeIndex < 0) {
      return;
    }

    optionRefs.current[activeIndex]?.focus();
  }, [activeIndex, isOpen]);

  useEffect(() => {
    if (!isOpen && wasOpenRef.current) {
      triggerRef.current?.focus();
    }

    wasOpenRef.current = isOpen;
  }, [isOpen]);

  function openSelect() {
    if (disabled) {
      return;
    }

    setActiveIndex(getInitialIndex(options, value));
    setIsOpen(true);
  }

  function handleTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (disabled) {
      return;
    }

    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp":
      case "Enter":
      case " ":
        event.preventDefault();
        if (!isOpen) {
          openSelect();
          return;
        }

        if (event.key === "ArrowDown") {
          setActiveIndex((current) => getNextIndex(options, current, 1));
        }

        if (event.key === "ArrowUp") {
          setActiveIndex((current) => getNextIndex(options, current, -1));
        }

        if (event.key === "Enter" || event.key === " ") {
          const option = options[activeIndex];
          if (option && !option.disabled) {
            onChange(option.value);
            setIsOpen(false);
          }
        }
        return;
      case "Home":
        event.preventDefault();
        setActiveIndex(getFirstEnabledIndex(options));
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(getLastEnabledIndex(options));
        break;
      default:
        if (event.key.length === 1) {
          const nextIndex = getTypeaheadIndex(options, event.key, activeIndex);
          if (nextIndex >= 0) {
            setActiveIndex(nextIndex);
            if (!isOpen) {
              openSelect();
            }
          }
        }
        return;
    }
  }

  function handleOptionKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, index: number) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex(getNextIndex(options, index, 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex(getNextIndex(options, index, -1));
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(getFirstEnabledIndex(options));
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(getLastEnabledIndex(options));
        break;
      case "Escape":
        event.preventDefault();
        setIsOpen(false);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (!options[index]?.disabled) {
          onChange(options[index].value);
          setIsOpen(false);
        }
        break;
      case "Tab":
        setIsOpen(false);
        break;
      default:
        if (event.key.length === 1) {
          const nextIndex = getTypeaheadIndex(options, event.key, index);
          if (nextIndex >= 0) {
            event.preventDefault();
            setActiveIndex(nextIndex);
          }
        }
        break;
    }
  }

  return (
    <div
      className={[
        "select-control",
        isOpen ? "select-control--open" : "",
        disabled ? "select-control--disabled" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      ref={rootRef}
    >
      <button
        ref={triggerRef}
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className="select-control__trigger"
        disabled={disabled}
        id={controlId}
        onClick={() => {
          if (isOpen) {
            setIsOpen(false);
            return;
          }

          openSelect();
        }}
        onKeyDown={handleTriggerKeyDown}
        type="button"
      >
        <span className="select-control__value">
          {selectedOption ? selectedOption.label : placeholder ?? "Pilih opsi"}
        </span>
        <AppIcon className="select-control__chevron" name="chevronDown" size="sm" />
      </button>

      {isOpen ? (
        <div className="select-control__menu" role="presentation">
          <ul
            aria-labelledby={controlId}
            className="select-control__listbox"
            id={listboxId}
            role="listbox"
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              const isActive = index == activeIndex;

              return (
                <li className="select-control__option-wrap" key={option.value} role="presentation">
                  <button
                    aria-selected={isSelected}
                    className={[
                      "select-control__option",
                      isSelected ? "select-control__option--selected" : "",
                      isActive ? "select-control__option--active" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    disabled={option.disabled}
                    id={`${controlId}-option-${index}`}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    onFocus={() => setActiveIndex(index)}
                    onKeyDown={(event) => handleOptionKeyDown(event, index)}
                    ref={(node) => {
                      optionRefs.current[index] = node;
                    }}
                    role="option"
                    type="button"
                  >
                    <span className="select-control__option-copy">
                      <span className="select-control__option-label">{option.label}</span>
                      {option.description ? (
                        <span className="select-control__option-description">{option.description}</span>
                      ) : null}
                    </span>
                    {isSelected ? <AppIcon name="chevronRight" size="sm" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function getInitialIndex<T extends string>(options: SelectOption<T>[], value: T) {
  const selectedIndex = options.findIndex((option) => option.value === value && !option.disabled);
  if (selectedIndex >= 0) {
    return selectedIndex;
  }

  return getFirstEnabledIndex(options);
}

function getFirstEnabledIndex<T extends string>(options: SelectOption<T>[]) {
  return options.findIndex((option) => !option.disabled);
}

function getLastEnabledIndex<T extends string>(options: SelectOption<T>[]) {
  for (let index = options.length - 1; index >= 0; index -= 1) {
    if (!options[index].disabled) {
      return index;
    }
  }

  return -1;
}

function getNextIndex<T extends string>(options: SelectOption<T>[], current: number, direction: 1 | -1) {
  if (options.length === 0) {
    return -1;
  }

  let index = current;
  for (let step = 0; step < options.length; step += 1) {
    index = (index + direction + options.length) % options.length;
    if (!options[index].disabled) {
      return index;
    }
  }

  return current;
}

function getTypeaheadIndex<T extends string>(options: SelectOption<T>[], key: string, current: number) {
  const normalizedKey = key.trim().toLowerCase();
  if (!normalizedKey) {
    return -1;
  }

  const orderedOptions = [...options.keys()].map((index) => ({
    index,
    option: options[index],
  }));
  const offset = current >= 0 ? current + 1 : 0;
  const rotated = [...orderedOptions.slice(offset), ...orderedOptions.slice(0, offset)];
  const match = rotated.find(({ option }) => !option.disabled && option.label.toLowerCase().startsWith(normalizedKey));
  return match?.index ?? -1;
}
