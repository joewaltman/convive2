import * as React from 'react';
import { EmailShell, H1, P, Eyebrow, palette } from './_shared';

export default function CronFailure({
  jobName,
  message,
  stack,
}: {
  jobName: string;
  message: string;
  stack: string;
}) {
  return (
    <EmailShell>
      <Eyebrow>Cron failure</Eyebrow>
      <H1>{jobName} failed</H1>
      <P>{message}</P>
      <pre
        style={{
          backgroundColor: palette.surface,
          padding: 12,
          fontSize: 12,
          fontFamily: 'Menlo, Consolas, monospace',
          whiteSpace: 'pre-wrap',
          color: palette.body,
          overflow: 'auto',
        }}
      >
        {stack.slice(0, 4000)}
      </pre>
    </EmailShell>
  );
}
