'use client';

export interface CheckboxOption {
  value: string;
  label: string;
}

export interface CheckboxGroupProps {
  name: string;
  options: CheckboxOption[];
  values: string[];
  onChange: (next: string[]) => void;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
  layout?: 'row' | 'grid';
}

export function CheckboxGroup({
  name,
  options,
  values,
  onChange,
  ariaInvalid,
  ariaDescribedBy,
  layout = 'grid',
}: CheckboxGroupProps) {
  function toggle(v: string, checked: boolean) {
    if (checked) {
      if (!values.includes(v)) onChange([...values, v]);
    } else {
      onChange(values.filter((x) => x !== v));
    }
  }
  const container =
    layout === 'row'
      ? 'flex flex-wrap gap-3'
      : 'grid grid-cols-1 sm:grid-cols-2 gap-3';
  return (
    <div
      role="group"
      aria-invalid={ariaInvalid || undefined}
      aria-describedby={ariaDescribedBy}
      className={container}
    >
      {options.map((opt) => {
        const checked = values.includes(opt.value);
        const id = `${name}-${opt.value}`;
        return (
          <label
            key={opt.value}
            htmlFor={id}
            className={`flex items-center gap-3 min-h-[52px] px-4 border rounded-sm cursor-pointer body-base bg-white ${
              checked ? 'border-terracotta' : 'border-border'
            }`}
          >
            <input
              id={id}
              type="checkbox"
              name={name}
              value={opt.value}
              checked={checked}
              onChange={(e) => toggle(opt.value, e.target.checked)}
              className="h-5 w-5 accent-terracotta"
            />
            <span>{opt.label}</span>
          </label>
        );
      })}
    </div>
  );
}
