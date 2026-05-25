/* eslint-disable react/no-unknown-property */
import * as React from 'react';

export const palette = {
  bone: '#F6F1E8',
  surface: '#EDE7DA',
  ink: '#1A1A1A',
  body: '#3F3A33',
  warm: '#6B6660',
  terracotta: '#B85C38',
  border: '#D9D1C3',
  white: '#FFFFFF',
};

export function EmailShell({
  children,
  accent,
}: {
  children: React.ReactNode;
  accent?: string;
}) {
  const accentColor = accent ?? palette.terracotta;
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: palette.bone,
          fontFamily: 'Helvetica, Arial, sans-serif',
          color: palette.body,
        }}
      >
        <div style={{ height: 6, backgroundColor: accentColor }} />
        <table
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          role="presentation"
          style={{ backgroundColor: palette.bone }}
        >
          <tbody>
            <tr>
              <td align="center" style={{ padding: '32px 16px' }}>
                <table
                  width="560"
                  cellPadding={0}
                  cellSpacing={0}
                  role="presentation"
                  style={{
                    maxWidth: 560,
                    backgroundColor: palette.white,
                    border: `1px solid ${palette.border}`,
                  }}
                >
                  <tbody>
                    <tr>
                      <td style={{ padding: '32px 32px 16px 32px' }}>
                        {children}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p
                  style={{
                    color: palette.warm,
                    fontSize: 12,
                    marginTop: 24,
                    maxWidth: 560,
                  }}
                >
                  You received this because you booked or expressed interest in a dinner. Reply to this email to reach the organizer.
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}

export function H1({ children }: { children: React.ReactNode }) {
  return (
    <h1
      style={{
        fontFamily: 'Georgia, serif',
        fontSize: 28,
        lineHeight: '1.15',
        color: palette.ink,
        margin: '0 0 16px 0',
        fontWeight: 500,
      }}
    >
      {children}
    </h1>
  );
}

export function P({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p style={{ fontSize: 15, lineHeight: '1.55', margin: '0 0 12px 0', color: palette.body, ...style }}>
      {children}
    </p>
  );
}

export function Button({ href, children, color }: { href: string; children: React.ReactNode; color?: string }) {
  return (
    <a
      href={href}
      style={{
        display: 'inline-block',
        backgroundColor: color ?? palette.terracotta,
        color: palette.white,
        padding: '10px 16px',
        textDecoration: 'none',
        fontSize: 14,
        fontWeight: 600,
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      {children}
    </a>
  );
}

export function Divider() {
  return (
    <div
      style={{
        height: 1,
        backgroundColor: palette.border,
        margin: '20px 0',
      }}
    />
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        textTransform: 'uppercase',
        letterSpacing: '0.18em',
        fontSize: 11,
        color: palette.warm,
        fontWeight: 600,
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
}
