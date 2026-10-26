import { useEffect, useId, useRef, useState } from "react";

type Props = {
  label: string;
  value: string[];
  options: readonly string[];
  onChange: (value: string[]) => void;
  help?: string;
  placeholder?: string;
};

export default function MultiSelectField({
  label,
  value,
  options,
  onChange,
  help,
  placeholder = "Escolha uma ou mais opções",
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const fieldId = useId();
  const menuId = `${fieldId}-menu`;

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const toggle = (option: string) => {
    onChange(
      value.includes(option)
        ? value.filter(item => item !== option)
        : [...value, option]
    );
  };

  return (
    <div className="studio-multi-field" ref={rootRef}>
      <span className="studio-form-label" id={`${fieldId}-label`}>
        {label}
      </span>
      <button
        type="button"
        className={`studio-multi-trigger${open ? " is-open" : ""}`}
        id={fieldId}
        aria-labelledby={`${fieldId}-label ${fieldId}`}
        aria-controls={menuId}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
      >
        <span className={value.length ? "" : "is-placeholder"}>
          {value.length
            ? `${value.length} opção${value.length === 1 ? "" : "ões"} selecionada${value.length === 1 ? "" : "s"}`
            : placeholder}
        </span>
        <span aria-hidden="true">{open ? "⌃" : "⌄"}</span>
      </button>
      {value.length > 0 && (
        <div
          className="studio-multi-values"
          aria-label={`${label} selecionadas`}
        >
          {value.map(option => (
            <button
              type="button"
              className="studio-multi-chip"
              key={option}
              onClick={() => toggle(option)}
              aria-label={`Remover ${option}`}
            >
              {option} <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      )}
      {open && (
        <div
          className="studio-multi-menu"
          id={menuId}
          role="group"
          aria-labelledby={`${fieldId}-label`}
        >
          {options.map(option => {
            const selected = value.includes(option);
            return (
              <label
                className={`studio-multi-option${selected ? " is-selected" : ""}`}
                key={option}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggle(option)}
                />
                <span className="studio-multi-check" aria-hidden="true">
                  {selected ? "✓" : ""}
                </span>
                <span>{option}</span>
              </label>
            );
          })}
          {value.length > 0 && (
            <button
              type="button"
              className="studio-multi-clear"
              onClick={() => onChange([])}
            >
              Limpar seleção
            </button>
          )}
        </div>
      )}
      {help && <small className="studio-field-help">{help}</small>}
    </div>
  );
}
