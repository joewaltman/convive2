import * as React from 'react';
import { EmailShell, H1, P, palette } from './_shared';

export default function MagicCodeAdmin({ code }: { code: string }) {
  return (
    <EmailShell>
      <H1>Your Con-Vive admin sign-in code</H1>
      <P>Use this code to sign in to the admin dashboard. It expires in 10 minutes.</P>
      <div
        style={{
          fontFamily: 'Menlo, Consolas, monospace',
          fontSize: 32,
          letterSpacing: '0.18em',
          backgroundColor: palette.surface,
          padding: '16px 20px',
          textAlign: 'center',
          color: palette.ink,
          margin: '12px 0',
        }}
      >
        {code}
      </div>
    </EmailShell>
  );
}
