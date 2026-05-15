import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

// TODO: replace with the real Shopify App Store URL once the listing is live.
const APP_STORE_URL: string | null = null;

export default async function Landing({
  searchParams,
}: {
  searchParams: Promise<{ shop?: string; host?: string; embedded?: string }>;
}) {
  // If Shopify is loading us in an iframe (always passes ?shop=) and the App
  // URL hasn't been updated to /app yet, route the merchant to the embedded
  // admin home instead of showing the marketing page.
  const sp = await searchParams;
  if (sp.shop) {
    const qs = new URLSearchParams({ shop: sp.shop });
    if (sp.host) qs.set("host", sp.host);
    if (sp.embedded) qs.set("embedded", sp.embedded);
    redirect(`/app?${qs.toString()}`);
  }

  return (
    <div className="flex flex-col flex-1 bg-white text-zinc-900">
      <header className="border-b border-zinc-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Image
              src="/logo.png"
              alt="Product Candy logo"
              width={32}
              height={32}
              priority
            />
            Product Candy
          </Link>
          <nav className="flex items-center gap-6 text-sm text-zinc-600">
            <a href="#features" className="hover:text-zinc-900">Features</a>
            <a href="mailto:support@productcandy.app" className="hover:text-zinc-900">Contact</a>
            <AppStoreCta variant="ghost" />
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 py-24 text-center">
          <Image
            src="/logo.png"
            alt="Product Candy logo"
            width={140}
            height={140}
            priority
            className="mx-auto mb-8"
          />
          <p className="mb-4 text-sm font-medium uppercase tracking-wider text-rose-500">
            Shopify admin app
          </p>
          <h1 className="mx-auto max-w-3xl text-balance text-5xl font-semibold leading-tight tracking-tight sm:text-6xl">
            Sweeter product pages, in two clicks.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-600">
            Polished description templates and one-click image cropping —
            without leaving your Shopify admin.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <AppStoreCta />
            <a
              href="#features"
              className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
            >
              See what it does →
            </a>
          </div>
        </section>

        <section id="features" className="border-t border-zinc-100 bg-zinc-50">
          <div className="mx-auto grid max-w-6xl gap-8 px-6 py-20 md:grid-cols-2">
            <Feature
              title="Description Layouts"
              body="Pick a polished template, fill in the blanks, and write rich HTML straight into your product description. No theme edits, no copy-paste."
            />
            <Feature
              title="Image Resize & Crop"
              body="Crop and resize product images right from the product page. We re-upload the result so your store always looks pixel-perfect."
            />
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h2 className="text-3xl font-semibold tracking-tight">
            Ready when you are.
          </h2>
          <p className="mt-4 text-zinc-600">
            Install Product Candy on your store and ship better-looking
            product pages this afternoon.
          </p>
          <div className="mt-8 flex justify-center">
            <AppStoreCta />
          </div>
        </section>

        <section className="border-t border-zinc-100 bg-zinc-50">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <p className="mb-2 text-center text-sm font-medium uppercase tracking-wider text-rose-500">
              More from us
            </p>
            <h2 className="mb-10 text-center text-2xl font-semibold tracking-tight">
              Other Shopify apps you might like
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              <SisterApp
                name="Chart Candy"
                tagline="Beautiful charts and dashboards for your store data."
                href="https://apps.shopify.com/chart-candy"
                accent="from-pink-400 to-rose-500"
              />
              <SisterApp
                name="Cart Tracker"
                tagline="Track abandoned carts and recover lost sales."
                href="https://apps.shopify.com/haveincart"
                accent="from-amber-400 to-orange-500"
              />
              <SisterApp
                name="Marketing Cost"
                tagline="See your true marketing spend and ROI in one place."
                href="https://apps.shopify.com/marketingcost"
                accent="from-sky-400 to-blue-500"
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-100">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-zinc-500 sm:flex-row">
          <span>© {new Date().getFullYear()} Product Candy</span>
          <a
            href="mailto:support@productcandy.app"
            className="hover:text-zinc-900"
          >
            support@productcandy.app
          </a>
        </div>
      </footer>
    </div>
  );
}

function SisterApp({
  name,
  tagline,
  href,
  accent,
}: {
  name: string;
  tagline: string;
  href: string;
  accent: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <span
        className={`inline-block size-10 shrink-0 rounded-lg bg-gradient-to-br ${accent}`}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <h3 className="text-base font-semibold text-zinc-900 group-hover:text-rose-600">
          {name} →
        </h3>
        <p className="mt-1 text-sm text-zinc-600">{tagline}</p>
      </div>
    </a>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="mt-3 text-zinc-600">{body}</p>
    </div>
  );
}

function AppStoreCta({ variant = "primary" }: { variant?: "primary" | "ghost" }) {
  const label = APP_STORE_URL
    ? "Get on the Shopify App Store"
    : "Coming soon to the Shopify App Store";
  const base =
    "inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium transition-colors";
  const styles =
    variant === "primary"
      ? "bg-rose-500 text-white hover:bg-rose-600 disabled:bg-zinc-300 disabled:text-zinc-600 disabled:cursor-not-allowed"
      : "text-zinc-700 hover:text-zinc-900";
  if (APP_STORE_URL) {
    return (
      <a href={APP_STORE_URL} className={`${base} ${styles}`}>
        {label}
      </a>
    );
  }
  return (
    <button type="button" disabled className={`${base} ${styles}`}>
      {label}
    </button>
  );
}
