'use client';

import { type ReactNode } from 'react';

export interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string | null;
  hint?: string | null;
  children: ReactNode;
}

export function Field({ id, label, required, error, hint, children }: FieldProps) {
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block body-base font-medium text-ink">
        {label}
        {required ? <span className="text-terracotta"> *</span> : null}
      </label>
      {hint ? (
        <p id={hintId} className="body-sm text-warm-gray">
          {hint}
        </p>
      ) : null}
      <FieldContext.Provider value={{ id, describedBy, hasError: Boolean(error) }}>
        {children}
      </FieldContext.Provider>
      {error ? (
        <p id={errorId} className="body-sm text-terracotta" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

import { createContext, useContext } from 'react';

interface FieldContextValue {
  id: string;
  describedBy?: string;
  hasError: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

export function useFieldContext(): FieldContextValue | null {
  return useContext(FieldContext);
}
