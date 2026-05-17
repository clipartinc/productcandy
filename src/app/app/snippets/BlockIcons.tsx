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
const previewBaseStyle: React.CSSProperties = {
  fontSize: 13,
  lineHeight: 1.4,
  color: "#374151",
  padding: "2px 4px",
};

const placeholderStyle: React.CSSProperties = {
  ...previewBaseStyle,
  color: "#9ca3af",
  fontStyle: "italic",
};

function truncate(text: string, max = 240): string {
  const t = text.trim();
  return t.length > max ? t.slice(0, max) + "…" : t;
}

export function BlockPreview({ block }: { block: Block }) {
  switch (block.kind) {
    case "heading": {
      const text = block.text?.trim();
      const fontSize = block.level === 2 ? 18 : 15;
      if (!text) {
        return (
          <div style={placeholderStyle}>
            (Empty {block.level === 2 ? "H2" : "H3"} heading)
          </div>
        );
      }
      return (
        <div
          style={{
            ...previewBaseStyle,
            fontSize,
            fontWeight: 600,
            color: "#111827",
          }}
        >
          {truncate(text)}
        </div>
      );
    }
    case "paragraph": {
      const text = block.text?.trim();
      if (!text) {
        return <div style={placeholderStyle}>(Empty paragraph)</div>;
      }
      return (
        <div style={{ ...previewBaseStyle, whiteSpace: "pre-wrap" }}>
          {truncate(text, 360)}
        </div>
      );
    }
    case "list": {
      const items = block.items.map((i) => i.trim()).filter(Boolean);
      if (items.length === 0) {
        return <div style={placeholderStyle}>(Empty list)</div>;
      }
      const Tag = block.style === "numbered" ? "ol" : "ul";
      const listStyleType =
        block.style === "numbered"
          ? "decimal"
          : block.style === "none"
          ? "none"
          : "disc";
      return (
        <Tag
          style={{
            ...previewBaseStyle,
            margin: 0,
            paddingLeft: block.style === "none" ? 0 : 22,
            listStyleType,
          }}
        >
          {items.slice(0, 6).map((it, i) => (
            <li key={i}>{truncate(it, 140)}</li>
          ))}
          {items.length > 6 && (
            <li style={{ listStyleType: "none", color: "#9ca3af" }}>
              … +{items.length - 6} more
            </li>
          )}
        </Tag>
      );
    }
    case "image": {
      if (!block.url) {
        return <div style={placeholderStyle}>(No image URL)</div>;
      }
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={block.url}
          alt={block.alt || ""}
          style={{
            maxWidth: "100%",
            maxHeight: 160,
            height: "auto",
            borderRadius: 4,
            display: "block",
            margin: "2px auto",
          }}
        />
      );
    }
    case "hero-cta":
      return (
        <div style={previewBaseStyle}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "#111827",
              marginBottom: 4,
            }}
          >
            {truncate(block.headline?.trim() || "(Empty headline)")}
          </div>
          <div style={{ marginBottom: 8, whiteSpace: "pre-wrap" }}>
            {truncate(block.body?.trim() || "(Empty body)", 240)}
          </div>
          <span
            style={{
              display: "inline-block",
              background: "#ec4899",
              color: "#fff",
              padding: "4px 12px",
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {truncate(block.ctaLabel?.trim() || "Button", 40)}
          </span>
        </div>
      );
    case "spec-row": {
      const entries = block.entries.filter(
        (e) => e.label.trim() || e.value.trim()
      );
      if (entries.length === 0) {
        return <div style={placeholderStyle}>(No rows)</div>;
      }
      return (
        <div style={previewBaseStyle}>
          {entries.slice(0, 6).map((e, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 12,
                padding: "4px 0",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <div
                style={{
                  flex: "1 1 30%",
                  minWidth: 80,
                  fontWeight: 600,
                  color: "#111827",
                }}
              >
                {truncate(e.label.trim() || "—", 60)}
              </div>
              <div style={{ flex: "1 1 70%" }}>
                {truncate(e.value.trim() || "—", 120)}
              </div>
            </div>
          ))}
          {entries.length > 6 && (
            <div style={{ color: "#9ca3af", padding: "4px 0" }}>
              … +{entries.length - 6} more
            </div>
          )}
        </div>
      );
    }
    case "html":
      return (
        <div
          style={{
            position: "relative",
            maxHeight: 160,
            overflow: "hidden",
            fontSize: 13,
            lineHeight: 1.4,
            color: "#374151",
            padding: 4,
          }}
        >
          <div
            className="canvas-html-preview"
            dangerouslySetInnerHTML={{ __html: block.html || "" }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: 30,
              background:
                "linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,1))",
              pointerEvents: "none",
            }}
          />
          <style jsx global>{`
            .canvas-html-preview p { margin: 0 0 6px 0; }
            .canvas-html-preview h2 { font-size: 1.05em; margin: 0 0 4px 0; font-weight: 600; }
            .canvas-html-preview h3 { font-size: 1em; margin: 0 0 4px 0; font-weight: 600; }
            .canvas-html-preview ul, .canvas-html-preview ol { padding-left: 18px; margin: 0 0 6px 0; }
            .canvas-html-preview li { margin-bottom: 2px; }
            .canvas-html-preview img { max-width: 100%; height: auto; border-radius: 4px; }
            .canvas-html-preview a { color: #ec4899; text-decoration: underline; }
            .canvas-html-preview div[style*="min-width"] { min-width: 0 !important; }
            .canvas-html-preview div[style*="flex-wrap"] { flex-wrap: nowrap !important; }
            .canvas-html-preview .pc-snippet-wrap { container-type: normal !important; }
            .canvas-html-preview .pc-snippet-row { flex-direction: row !important; flex-wrap: nowrap !important; }
            .canvas-html-preview .pc-snippet-row > .pc-snippet-col { flex: 1 1 0 !important; min-width: 0 !important; width: auto !important; max-width: none !important; }
            .canvas-html-preview { max-width: none !important; }
          `}</style>
        </div>
      );
  }
}
