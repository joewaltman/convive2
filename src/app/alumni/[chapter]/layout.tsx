import { notFound } from 'next/navigation';
import { getChapterBySlug } from '@/lib/chapters';
import {
  Inter,
  Cormorant_Garamond,
  Playfair_Display,
  Lora,
} from 'next/font/google';

// Pre-load common chapter fonts. The font family name from DB must match these keys.
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'] });
const cormorantGaramond = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});
const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});
const lora = Lora({ subsets: ['latin'], weight: ['400', '500', '600', '700'] });

// Map font-family DB values to loaded font objects
const FONT_MAP: Record<string, { className: string }> = {
  'Inter': inter,
  'Inter, system-ui, sans-serif': inter,
  'Cormorant Garamond': cormorantGaramond,
  'Cormorant Garamond, Georgia, serif': cormorantGaramond,
  'Playfair Display': playfairDisplay,
  'Playfair Display, Georgia, serif': playfairDisplay,
  'Lora': lora,
  'Lora, Georgia, serif': lora,
};

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ chapter: string }>;
}

export default async function ChapterLayout({ children, params }: LayoutProps) {
  const { chapter: slug } = await params;
  const chapter = await getChapterBySlug(slug);

  if (!chapter) {
    notFound();
  }

  // Find a matching font or default to Inter
  const fontKey = Object.keys(FONT_MAP).find((key) =>
    chapter.font_family.toLowerCase().includes(key.toLowerCase().split(',')[0])
  );
  const font = fontKey ? FONT_MAP[fontKey] : inter;

  const cssVars = {
    '--chapter-primary': chapter.color_primary,
    '--chapter-secondary': chapter.color_secondary,
    '--chapter-header-bg': chapter.color_header_bg,
    '--chapter-header-text': chapter.color_header_text,
    '--chapter-accent': chapter.color_accent,
  } as React.CSSProperties;

  return (
    <div style={cssVars} className={font.className}>
      {/* Header: chapter display name only, no Con-Vive branding */}
      <header
        className="py-4"
        style={{
          backgroundColor: 'var(--chapter-header-bg)',
          color: 'var(--chapter-header-text)',
        }}
      >
        <div className="max-w-5xl mx-auto px-6">
          <h1 className="text-xl font-semibold">{chapter.display_name}</h1>
        </div>
      </header>

      <main className="min-h-screen bg-bone">{children}</main>

      {/* Footer: generic, no Con-Vive branding */}
      <footer className="py-6 bg-surface border-t border-border">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="body-sm text-warm-gray">
            Questions? Contact your chapter coordinator.
          </p>
        </div>
      </footer>
    </div>
  );
}
