import type { Block, BlockKind } from "@/lib/snippetBlocks";

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

/**
 * Larger visual representation of a block, used in the canvas. Looks like
 * the layout previews in the action extension modal so the merchant can see
 * the structure of what they're building at a glance — much more readable
 * than a tiny icon + label.
 */
const PREVIEW = {
  width: "100%",
  viewBox: "0 0 240 120",
  fill: "none",
  preserveAspectRatio: "xMidYMid meet" as const,
  xmlns: "http://www.w3.org/2000/svg",
};

export function BlockPreview({ block }: { block: Block }) {
  switch (block.kind) {
    case "heading":
      return (
        <svg {...PREVIEW} style={{ height: 60 }}>
          <rect x="20" y="20" width={block.level === 2 ? 200 : 160} height={block.level === 2 ? 14 : 10} rx="2" fill="#374151" />
          <rect x="20" y={block.level === 2 ? 42 : 36} width="120" height="4" rx="1" fill="#d1d5db" />
        </svg>
      );
    case "paragraph":
      return (
        <svg {...PREVIEW} style={{ height: 80 }}>
          <rect x="20" y="14" width="200" height="6" rx="2" fill="#9ca3af" />
          <rect x="20" y="26" width="200" height="6" rx="2" fill="#9ca3af" />
          <rect x="20" y="38" width="200" height="6" rx="2" fill="#9ca3af" />
          <rect x="20" y="50" width="180" height="6" rx="2" fill="#9ca3af" />
          <rect x="20" y="62" width="140" height="6" rx="2" fill="#9ca3af" />
        </svg>
      );
    case "list":
      return (
        <svg {...PREVIEW} style={{ height: 100 }}>
          {Array.from({ length: block.items.length || 4 }).map((_, i) => (
            <g key={i}>
              <circle cx="28" cy={18 + i * 18} r="3" fill="#ec4899" />
              <rect x="36" y={15 + i * 18} width={160 - i * 12} height="6" rx="2" fill="#9ca3af" />
            </g>
          ))}
        </svg>
      );
    case "image":
      return (
        <svg {...PREVIEW} style={{ height: 80 }}>
          <rect x="20" y="10" width="200" height="100" rx="6" fill="#fbcfe8" stroke="#ec4899" strokeWidth="1" />
          <circle cx="50" cy="40" r="8" fill="#ec4899" opacity="0.6" />
          <polygon points="20,110 60,70 100,90 160,50 220,110" fill="#ec4899" opacity="0.4" />
        </svg>
      );
    case "hero-cta":
      return (
        <svg {...PREVIEW} style={{ height: 110 }}>
          <rect x="20" y="14" width="180" height="14" rx="3" fill="#374151" />
          <rect x="20" y="34" width="140" height="14" rx="3" fill="#374151" />
          <rect x="20" y="60" width="200" height="5" rx="2" fill="#9ca3af" />
          <rect x="20" y="70" width="160" height="5" rx="2" fill="#9ca3af" />
          <rect x="20" y="88" width="100" height="22" rx="6" fill="#ec4899" />
          <rect x="40" y="96" width="60" height="6" rx="2" fill="#ffffff" />
        </svg>
      );
    case "spec-row":
      return (
        <svg {...PREVIEW} style={{ height: 60 }}>
          <rect x="20" y="20" width="50" height="8" rx="2" fill="#374151" />
          <rect x="80" y="22" width="140" height="6" rx="2" fill="#9ca3af" />
          <line x1="20" y1="42" x2="220" y2="42" stroke="#e5e7eb" strokeWidth="1" />
        </svg>
      );
    case "html":
      return (
        <svg {...PREVIEW} style={{ height: 70 }}>
          <rect x="20" y="14" width="200" height="56" rx="4" fill="#f3f4f6" />
          <text x="32" y="46" fill="#6b7280" fontFamily="monospace" fontSize="14">
            &lt;/&gt; Custom HTML
          </text>
        </svg>
      );
  }
}
