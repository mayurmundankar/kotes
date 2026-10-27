"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Person, Read, Shelf } from "./icons";

const ITEMS = [
  { href: "/feed", label: "Read", Icon: Read },
  { href: "/library", label: "Kept", Icon: Shelf },
  { href: "/you", label: "You", Icon: Person },
];

// `tone` lets the bar blend into whichever quote card sits behind it.
export function Nav({ tone }: { tone?: string }) {
  const path = usePathname();
  return (
    <nav className="nav" data-tone={tone} aria-label="Main">
      {ITEMS.map(({ href, label, Icon }) => (
        <Link key={href} href={href} aria-current={path === href ? "page" : undefined}>
          <Icon />
          {label}
          <span className="dot" />
        </Link>
      ))}
    </nav>
  );
}
