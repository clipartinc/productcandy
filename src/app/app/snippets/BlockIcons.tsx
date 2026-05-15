import type { BlockKind } from "@/lib/snippetBlocks";

const COMMON = {
  width: 56,
  height: 40,
  viewBox: "0 0 56 40",
  fill: "none",
  stroke: "#6b7280",
  strokeWidth: 1.5,
  xmlns: "http://www.w3.org/2000/svg",
} as const;

export function BlockIcon({ kind }: { kind: BlockKind }) {
  switch (kind) {
    case "heading":
      return (
        <svg {...COMMON}>
          <rect x="6" y="14" width="44" height="6" rx="1" fill="#374151" stroke="none" />
          <rect x="6" y="24" width="28" height="3" rx="1" fill="#9ca3af" stroke="none" />
        </svg>
      );
    case "paragraph":
      return (
        <svg {...COMMON}>
          <rect x="6" y="10" width="44" height="3" rx="1" fill="#9ca3af" stroke="none" />
          <rect x="6" y="16" width="44" height="3" rx="1" fill="#9ca3af" stroke="none" />
          <rect x="6" y="22" width="36" height="3" rx="1" fill="#9ca3af" stroke="none" />
          <rect x="6" y="28" width="40" height="3" rx="1" fill="#9ca3af" stroke="none" />
        </svg>
      );
    case "list":
      return (
        <svg {...COMMON}>
          <circle cx="9" cy="13" r="1.5" fill="#ec4899" stroke="none" />
          <rect x="14" y="11.5" width="34" height="3" rx="1" fill="#9ca3af" stroke="none" />
          <circle cx="9" cy="20" r="1.5" fill="#ec4899" stroke="none" />
          <rect x="14" y="18.5" width="30" height="3" rx="1" fill="#9ca3af" stroke="none" />
          <circle cx="9" cy="27" r="1.5" fill="#ec4899" stroke="none" />
          <rect x="14" y="25.5" width="32" height="3" rx="1" fill="#9ca3af" stroke="none" />
        </svg>
      );
    case "image":
      return (
        <svg {...COMMON}>
          <rect x="6" y="6" width="44" height="28" rx="2" fill="#fbcfe8" stroke="#ec4899" strokeWidth="1" />
          <circle cx="14" cy="14" r="2.5" fill="#ec4899" />
          <path d="M6 30 L18 20 L26 26 L34 16 L50 30 Z" fill="#ec4899" fillOpacity="0.5" stroke="none" />
        </svg>
      );
    case "two-column":
      return (
        <svg {...COMMON}>
          <rect x="6" y="6" width="20" height="28" rx="2" fill="#e5e7eb" stroke="none" />
          <rect x="30" y="6" width="20" height="28" rx="2" fill="#e5e7eb" stroke="none" />
          <rect x="9" y="10" width="14" height="3" rx="1" fill="#ec4899" stroke="none" />
          <rect x="9" y="17" width="14" height="2" rx="1" fill="#9ca3af" stroke="none" />
          <rect x="9" y="22" width="11" height="2" rx="1" fill="#9ca3af" stroke="none" />
          <rect x="33" y="10" width="14" height="3" rx="1" fill="#ec4899" stroke="none" />
          <rect x="33" y="17" width="14" height="2" rx="1" fill="#9ca3af" stroke="none" />
          <rect x="33" y="22" width="11" height="2" rx="1" fill="#9ca3af" stroke="none" />
        </svg>
      );
    case "three-column":
      return (
        <svg {...COMMON}>
          <rect x="6" y="6" width="13" height="28" rx="2" fill="#e5e7eb" stroke="none" />
          <rect x="21.5" y="6" width="13" height="28" rx="2" fill="#e5e7eb" stroke="none" />
          <rect x="37" y="6" width="13" height="28" rx="2" fill="#e5e7eb" stroke="none" />
          <rect x="9" y="10" width="7" height="3" rx="1" fill="#ec4899" stroke="none" />
          <rect x="9" y="17" width="7" height="2" rx="1" fill="#9ca3af" stroke="none" />
          <rect x="24.5" y="10" width="7" height="3" rx="1" fill="#ec4899" stroke="none" />
          <rect x="24.5" y="17" width="7" height="2" rx="1" fill="#9ca3af" stroke="none" />
          <rect x="40" y="10" width="7" height="3" rx="1" fill="#ec4899" stroke="none" />
          <rect x="40" y="17" width="7" height="2" rx="1" fill="#9ca3af" stroke="none" />
        </svg>
      );
    case "hero-cta":
      return (
        <svg {...COMMON}>
          <rect x="6" y="6" width="40" height="6" rx="1" fill="#374151" stroke="none" />
          <rect x="6" y="16" width="36" height="3" rx="1" fill="#9ca3af" stroke="none" />
          <rect x="6" y="22" width="30" height="3" rx="1" fill="#9ca3af" stroke="none" />
          <rect x="6" y="29" width="20" height="6" rx="2" fill="#ec4899" stroke="none" />
        </svg>
      );
    case "spec-row":
      return (
        <svg {...COMMON}>
          <rect x="6" y="9" width="14" height="3" rx="1" fill="#374151" stroke="none" />
          <rect x="22" y="9" width="28" height="3" rx="1" fill="#9ca3af" stroke="none" />
          <line x1="6" y1="16" x2="50" y2="16" stroke="#e5e7eb" strokeWidth="1" />
          <rect x="6" y="20" width="14" height="3" rx="1" fill="#374151" stroke="none" />
          <rect x="22" y="20" width="22" height="3" rx="1" fill="#9ca3af" stroke="none" />
          <line x1="6" y1="27" x2="50" y2="27" stroke="#e5e7eb" strokeWidth="1" />
          <rect x="6" y="31" width="14" height="3" rx="1" fill="#374151" stroke="none" />
          <rect x="22" y="31" width="20" height="3" rx="1" fill="#9ca3af" stroke="none" />
        </svg>
      );
    case "html":
      return (
        <svg {...COMMON}>
          <text x="9" y="26" fill="#6b7280" fontFamily="monospace" fontSize="14">
            &lt;/&gt;
          </text>
        </svg>
      );
  }
}
