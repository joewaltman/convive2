import * as React from 'react';
import { EmailShell, H1, P, palette } from './_shared';

export default function MagicCodeGuest({ code }: { code: string }) {
  return (
    <EmailShell>
      <H1>Your sign-in code</H1>
      <P>Use this code to sign in. It expires in 10 minutes.</P>
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
      <P style={{ color: palette.warm, fontSize: 13 }}>
        If you did not request this code, you can safely ignore this email.
      </P>
    </EmailShell>
  );
}
