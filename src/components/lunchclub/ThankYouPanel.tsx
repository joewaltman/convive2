export interface ThankYouPanelProps {
  firstName: string;
}

export function ThankYouPanel({ firstName }: ThankYouPanelProps) {
  const name = firstName && firstName.trim().length > 0 ? firstName.trim() : 'there';
  return (
    <div className="py-12 text-center space-y-4">
      <h2 className="heading-2">Thanks, {name}.</h2>
      <p className="body-lg text-body">
        We&apos;ll be in touch with the details for your first lunch.
      </p>
    </div>
  );
}
