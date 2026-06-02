import Link from "next/link";

export const FOOTER_LINKS = [
  { href: "/privacy", label: "Политика конфиденциальности" },
  { href: "/terms", label: "Условия использования" },
  { href: "/refunds", label: "Возврат средств" },
  { href: "/contacts", label: "Контакты" },
  { href: "/pricing", label: "Тарифы" },
] as const;

const LINK_COLOR = "rgba(148, 153, 162, 0.38)";
const LINK_UNDERLINE = "rgba(148, 153, 162, 0.28)";

export function LandingFooter() {
  return (
    <footer
      className="border-t border-white/[0.04] pt-6"
      style={{ paddingBottom: "calc(32px + env(safe-area-inset-bottom))" }}
    >
      <nav
        aria-label="Правовая информация"
        className="mx-auto flex max-w-xs flex-col items-stretch gap-1.5 sm:max-w-sm"
      >
        {FOOTER_LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="px-3 py-1.5 text-center text-[10px] leading-snug underline underline-offset-[3px] transition duration-200 sm:text-[11px]"
            style={{ color: LINK_COLOR, textDecorationColor: LINK_UNDERLINE }}
          >
            {label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
