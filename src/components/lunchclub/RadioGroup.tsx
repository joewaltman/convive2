'use client';

export interface RadioOption {
  value: string;
  label: string;
}

export interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  value: string | null;
  onChange: (v: string) => void;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
}

export function RadioGroup({
  name,
  options,
  value,
  onChange,
  ariaInvalid,
  ariaDescribedBy,
}: RadioGroupProps) {
  return (
    <div
      role="radiogroup"
      aria-invalid={ariaInvalid || undefined}
      aria-describedby={ariaDescribedBy}
      className="flex flex-col gap-3"
    >
      {options.map((opt) => {
        const id = `${name}-${opt.value}`;
        const checked = value === opt.value;
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
              type="radio"
              name={name}
              value={opt.value}
              checked={checked}
              onChange={() => onChange(opt.value)}
              className="h-5 w-5 accent-terracotta"
            />
            <span>{opt.label}</span>
          </label>
        );
      })}
    </div>
  );
}
