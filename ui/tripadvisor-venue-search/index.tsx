import { createRoot } from "react-dom/client";
import { useMemo } from "react";

import { Button } from "@openai/apps-sdk-ui/components/Button";
import { useWidgetProps } from "../hooks/use-widget-props";

type Venue = {
  name: string;
  details?: string;
  type?: string;
  tripadvisorUrl: string;
  tripadvisorSearchUrl: string;
  fetch?: { ok: boolean; status?: number; blocked?: boolean; error?: string };
  signals?: { description?: string; ratingValue?: number; reviewCount?: number };
};

type ToolOutput = {
  query?: string;
  city?: string;
  country?: string;
  tripadvisorSearchUrl?: string;
  venues?: Venue[];
  warnings?: string[];
  notes?: string[];
};

function toAbsUrl(maybeRelative: string): string {
  try {
    return new URL(maybeRelative, window.location.origin).toString();
  } catch {
    return maybeRelative;
  }
}

function App() {
  const output = useWidgetProps<ToolOutput>(() => ({
    query: "",
    city: "",
    country: "",
    tripadvisorSearchUrl: "",
    venues: [],
    warnings: [],
    notes: [],
  }));

  const venues = Array.isArray(output.venues) ? output.venues : [];
  const warnings = Array.isArray(output.warnings) ? output.warnings : [];
  const notes = Array.isArray(output.notes) ? output.notes : [];

  const header = useMemo(() => {
    const parts = [output.city, output.country].filter(Boolean);
    return parts.length ? parts.join(", ") : "TripAdvisor venue search";
  }, [output.city, output.country]);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-slate-900">
            Wedding venues • {header}
          </h1>
          {output.query ? (
            <p className="text-xs text-slate-600">Query: {output.query}</p>
          ) : null}
        </div>

        {output.tripadvisorSearchUrl ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            color="secondary"
            onClick={() =>
              window.openai.openExternal({
                href: toAbsUrl(output.tripadvisorSearchUrl ?? ""),
              })
            }
          >
            Open TripAdvisor Search
          </Button>
        ) : null}
      </header>

      {warnings.length ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          {warnings.join(" • ")}
        </div>
      ) : null}

      <section className="mt-5 space-y-3">
        {venues.length ? (
          venues.map((v, idx) => (
            <article
              key={`${v.tripadvisorUrl}-${idx}`}
              className="rounded-3xl border border-black/10 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-slate-900">
                    {idx + 1}. {v.name}
                  </h2>
                  <p className="mt-1 text-xs text-slate-600">
                    {[v.type, v.details].filter(Boolean).join(" • ")}
                  </p>
                  <p className="mt-2 text-xs text-slate-700">
                    {v.signals?.ratingValue != null ? (
                      <>
                        Rating: <span className="font-medium">{v.signals.ratingValue}</span>
                      </>
                    ) : (
                      "Rating: (not available)"
                    )}
                    {v.signals?.reviewCount != null ? (
                      <>
                        {" "}
                        • Reviews:{" "}
                        <span className="font-medium">{v.signals.reviewCount}</span>
                      </>
                    ) : null}
                    {v.fetch?.blocked ? (
                      <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-700">
                        blocked
                      </span>
                    ) : null}
                  </p>
                </div>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  color="secondary"
                  onClick={() =>
                    window.openai.openExternal({ href: toAbsUrl(v.tripadvisorUrl) })
                  }
                >
                  Open
                </Button>
              </div>

              {v.signals?.description ? (
                <p className="mt-3 text-xs leading-relaxed text-slate-700">
                  {v.signals.description}
                </p>
              ) : null}
            </article>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-black/20 bg-white p-6 text-sm text-slate-600">
            No venues returned. Open the TripAdvisor search link and pick venues manually.
          </div>
        )}
      </section>

      {notes.length ? (
        <footer className="mt-6 rounded-2xl border border-black/10 bg-slate-50 p-3 text-xs text-slate-700">
          {notes.join(" ")}
        </footer>
      ) : null}
    </div>
  );
}

const root = document.getElementById("tripadvisor-venue-search-root");
if (root) {
  createRoot(root).render(<App />);
}

