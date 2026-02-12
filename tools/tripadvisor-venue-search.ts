import { z } from "zod/v3";
import { defineTool } from "../utils/define-tool";

type TripadvisorTypeaheadResult = {
  displayName?: string;
  details?: string;
  url?: string;
  type?: string;
};

type TripadvisorTypeaheadResponse = {
  results?: TripadvisorTypeaheadResult[];
};

type VenueResult = {
  name: string;
  details?: string;
  type?: string;
  tripadvisorUrl: string;
  tripadvisorSearchUrl: string;
  fetch?: {
    ok: boolean;
    status?: number;
    blocked?: boolean;
    error?: string;
  };
  signals?: {
    description?: string;
    ratingValue?: number;
    reviewCount?: number;
  };
};

const inputSchema = z.object({
  city: z.string().trim().min(1).describe("City to search in (e.g. 'Austin')."),
  country: z
    .string()
    .trim()
    .min(1)
    .describe("Country to refine the query (e.g. 'United States')."),
  query: z
    .string()
    .trim()
    .optional()
    .describe("Optional override query. Default is '<city> <country> wedding venue'."),
  maxResults: z
    .number()
    .int()
    .min(1)
    .max(10)
    .default(5)
    .describe("Max results to return."),
  includePageSignals: z
    .boolean()
    .default(true)
    .describe(
      "If true, fetch each result page and extract lightweight 'review signals' (rating/count/description) when possible.",
    ),
});

function tripadvisorSearchUrl(query: string): string {
  return `https://www.tripadvisor.com/Search?q=${encodeURIComponent(query)}`;
}

function normalizeTripadvisorUrl(maybeRelative: string): string {
  if (!maybeRelative) return "";
  if (maybeRelative.startsWith("http://") || maybeRelative.startsWith("https://")) {
    return maybeRelative;
  }
  if (maybeRelative.startsWith("/")) {
    return `https://www.tripadvisor.com${maybeRelative}`;
  }
  return `https://www.tripadvisor.com/${maybeRelative.replace(/^\/+/, "")}`;
}

function looksBlocked(html: string): boolean {
  const lowered = html.toLowerCase();
  return (
    lowered.includes("cf-chl") ||
    lowered.includes("cloudflare") ||
    lowered.includes("just a moment") ||
    lowered.includes("enable javascript and cookies") ||
    lowered.includes("attention required")
  );
}

function extractMetaDescription(html: string): string | undefined {
  const match = html.match(
    /<meta\s+name=["']description["']\s+content=["']([^"']+)["']\s*\/?>/i,
  );
  const content = match?.[1]?.trim();
  return content ? content : undefined;
}

function extractJsonLdAggregate(html: string): {
  ratingValue?: number;
  reviewCount?: number;
} {
  // TripAdvisor pages sometimes include JSON-LD blocks. We'll parse the first
  // few blocks and look for aggregateRating.
  const scripts = html.match(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  if (!scripts?.length) return {};

  for (const scriptTag of scripts.slice(0, 6)) {
    const m = scriptTag.match(
      /<script[^>]*>([\s\S]*?)<\/script>/i,
    );
    const raw = m?.[1]?.trim();
    if (!raw) continue;
    try {
      const json = JSON.parse(raw) as any;
      const agg = json?.aggregateRating ?? (Array.isArray(json) ? json.find((x) => x?.aggregateRating)?.aggregateRating : undefined);
      if (agg) {
        const ratingValue = Number(agg.ratingValue);
        const reviewCount = Number(agg.reviewCount);
        return {
          ...(Number.isFinite(ratingValue) ? { ratingValue } : {}),
          ...(Number.isFinite(reviewCount) ? { reviewCount } : {}),
        };
      }
    } catch {
      // ignore parse failures
    }
  }
  return {};
}

async function fetchTypeahead(query: string): Promise<TripadvisorTypeaheadResult[]> {
  // Unofficial endpoint. May change / be rate-limited / blocked.
  const url = new URL("https://www.tripadvisor.com/TypeAheadJson");
  url.searchParams.set("action", "API");
  url.searchParams.set("query", query);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "application/json,text/plain,*/*",
    },
  });

  if (!res.ok) {
    throw new Error(`TripAdvisor typeahead failed (${res.status})`);
  }

  const data = (await res.json()) as TripadvisorTypeaheadResponse;
  return Array.isArray(data.results) ? data.results : [];
}

async function fetchPageSignals(tripadvisorUrl: string): Promise<{
  fetch: VenueResult["fetch"];
  signals?: VenueResult["signals"];
}> {
  try {
    const res = await fetch(tripadvisorUrl, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,*/*",
      },
    });

    const status = res.status;
    const html = await res.text();
    const blocked = looksBlocked(html);

    const description = blocked ? undefined : extractMetaDescription(html);
    const aggregate = blocked ? {} : extractJsonLdAggregate(html);

    return {
      fetch: { ok: res.ok, status, blocked },
      signals: {
        ...(description ? { description } : {}),
        ...aggregate,
      },
    };
  } catch (error) {
    return {
      fetch: {
        ok: false,
        error: error instanceof Error ? error.message : "Fetch failed",
      },
    };
  }
}

export default defineTool({
  name: "tripadvisor-venue-search",
  title: "TripAdvisor: Search Wedding Venues (Best-Effort)",
  description:
    "Programmatically searches TripAdvisor for wedding venues in a city (best-effort; may be blocked). Returns venue links and optional review signals (rating/count/description) when available.",
  annotations: {
    readOnlyHint: true,
    openWorldHint: true,
    destructiveHint: false,
  },
  input: inputSchema,
  ui: "tripadvisor-venue-search",
  invoking: "Searching TripAdvisor for venues",
  invoked: "TripAdvisor search complete",
  async handler(input) {
    const query =
      input.query?.trim() || `${input.city} ${input.country} wedding venue`;

    const searchUrl = tripadvisorSearchUrl(query);

    let results: TripadvisorTypeaheadResult[] = [];
    let typeaheadError: string | null = null;

    try {
      results = await fetchTypeahead(query);
    } catch (error) {
      typeaheadError = error instanceof Error ? error.message : "Typeahead failed";
    }

    const normalized: VenueResult[] = results
      .filter((r) => typeof r.displayName === "string" && r.displayName.trim())
      .slice(0, input.maxResults)
      .map((r) => {
        const tripadvisorUrl = normalizeTripadvisorUrl(String(r.url ?? ""));
        return {
          name: String(r.displayName).trim(),
          details: typeof r.details === "string" ? r.details : undefined,
          type: typeof r.type === "string" ? r.type : undefined,
          tripadvisorUrl: tripadvisorUrl || searchUrl,
          tripadvisorSearchUrl: searchUrl,
        };
      });

    if (input.includePageSignals) {
      for (let i = 0; i < normalized.length; i += 1) {
        const v = normalized[i]!;
        // Skip fetching if we only have a search URL.
        if (v.tripadvisorUrl === searchUrl) continue;
        const { fetch, signals } = await fetchPageSignals(v.tripadvisorUrl);
        v.fetch = fetch;
        if (signals && Object.keys(signals).length) {
          v.signals = signals;
        }
      }
    }

    const text = [
      `TripAdvisor search: ${searchUrl}`,
      typeaheadError ? `Typeahead warning: ${typeaheadError}` : "",
      "",
      normalized.length
        ? "Results:"
        : "No programmatic results (TripAdvisor may be blocking automated requests). Use the search link above.",
      ...normalized.map((v, idx) => {
        const rating =
          v.signals?.ratingValue != null ? ` • rating ${v.signals.ratingValue}` : "";
        const count =
          v.signals?.reviewCount != null ? ` (${v.signals.reviewCount} reviews)` : "";
        const blocked = v.fetch?.blocked ? " • blocked" : "";
        return `${idx + 1}) ${v.name}${rating}${count}${blocked}\n   ${v.tripadvisorUrl}`;
      }),
    ]
      .filter(Boolean)
      .join("\n");

    return {
      content: [{ type: "text", text }],
      structuredContent: {
        query,
        city: input.city,
        country: input.country,
        tripadvisorSearchUrl: searchUrl,
        venues: normalized,
        warnings: typeaheadError ? [typeaheadError] : [],
        notes: [
          "TripAdvisor may block automated requests; when blocked, use the returned search URL and open in a browser.",
          "If you need full review text summaries, consider an official data source or user-provided excerpts.",
        ],
      },
    };
  },
});

