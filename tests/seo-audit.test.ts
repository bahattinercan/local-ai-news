import { test } from "node:test";
import assert from "node:assert/strict";
import {
  loadAuditInput,
  runAudit,
  type AuditInput,
  type AuditResult,
  type CheckId,
  type CheckResult
} from "../scripts/seo-audit.ts";
import { SITE_URL, isIndexableModel, languageAlternates, modelPath } from "../src/lib/seo.ts";

/**
 * The audit is a gate, so the test that matters is the one proving it *fails*.
 * Every case below mutates an in-memory copy of the real audit input — the
 * snapshot, the sitemap and the pages the route modules actually build — and
 * asserts that the named check, and only the intended finding, catches it. No
 * test writes to disk; `data/feed.json` and the route modules are read-only
 * fixtures here.
 */
const base = await loadAuditInput();

function auditWith(mutate: (_input: AuditInput) => void): AuditResult {
  const input = structuredClone(base);
  mutate(input);
  return runAudit(input);
}

function check(result: AuditResult, id: CheckId): CheckResult {
  const found = result.checks.find((candidate) => candidate.id === id);
  assert.ok(found, `the audit must report a "${id}" check`);
  return found;
}

function pageIndex(input: AuditInput, locale: string, path: string): number {
  const index = input.pages.findIndex((candidate) => candidate.locale === locale && candidate.path === path);
  assert.ok(index >= 0, `the audit input must cover ${locale} ${path}`);
  return index;
}

test("the audit passes on the committed snapshot, sitemap and route modules", () => {
  const result = runAudit(base);
  assert.deepEqual(result.failures, []);
  assert.equal(result.ok, true);
  for (const id of ["meta", "titles", "canonical", "alternates", "sitemap", "robots", "index-policy"] as const) {
    assert.equal(check(result, id).ok, true, `${id} should pass: ${check(result, id).failures.join("; ")}`);
  }
});

test("the audit input is offline and complete", () => {
  assert.ok(base.snapshot, "the audit reads the snapshot through the store");
  assert.ok(base.sitemap.length > 0);
  assert.ok(base.pages.length >= 20);
  assert.ok(base.pages.some((page) => page.routeType === "model"));
  assert.ok(base.pages.some((page) => page.routeType === "news-detail"));
  assert.ok(base.pages.some((page) => page.routeType === "glossary-term"));
  assert.equal(base.siteUrl, SITE_URL);
});

test("an empty in-memory title fails the meta check and names the page", () => {
  const result = auditWith((input) => {
    input.pages[pageIndex(input, "en", "/models")].title = "   ";
  });
  const meta = check(result, "meta");
  assert.equal(meta.ok, false);
  assert.ok(
    meta.failures.some((failure) => failure.includes("en /models") && failure.includes("empty title")),
    meta.failures.join("; ")
  );
  assert.equal(result.ok, false, "a broken title must exit non-zero");
});

test("an empty in-memory description fails the meta check", () => {
  const result = auditWith((input) => {
    input.pages[pageIndex(input, "tr", "/news")].description = "";
  });
  const meta = check(result, "meta");
  assert.equal(meta.ok, false);
  assert.ok(meta.failures.some((failure) => failure.includes("tr /news") && failure.includes("empty description")));
});

test("two pages sharing a title fail the titles check and name both paths", () => {
  const result = auditWith((input) => {
    const front = input.pages[pageIndex(input, "en", "/")];
    input.pages[pageIndex(input, "en", "/models")].title = front.title;
  });
  const titles = check(result, "titles");
  assert.equal(titles.ok, false);
  assert.ok(
    titles.failures.some((failure) => failure.includes("/models") && failure.includes("emitted by both")),
    titles.failures.join("; ")
  );
});

test("a detached canonical fails the canonical check with the value it found", () => {
  const result = auditWith((input) => {
    input.pages[pageIndex(input, "en", "/models")].canonical = `${SITE_URL}/en/m/not-this-page`;
  });
  const canonical = check(result, "canonical");
  assert.equal(canonical.ok, false);
  const failure = canonical.failures.find((value) => value.includes("en /models"));
  assert.ok(failure, canonical.failures.join("; "));
  assert.match(failure, /not-this-page/);
  assert.equal(result.ok, false, "a broken canonical must exit non-zero");
});

test("an advertised path missing one of its alternates fails the alternates check", () => {
  const result = auditWith((input) => {
    const drop = languageAlternates("/models").tr;
    input.sitemap = input.sitemap.filter((entry) => entry.url !== drop);
  });
  const alternates = check(result, "alternates");
  assert.equal(alternates.ok, false);
  assert.ok(
    alternates.failures.some((failure) => failure.includes("/models") && failure.includes("tr alternate")),
    alternates.failures.join("; ")
  );
});

test("a duplicated sitemap URL fails the sitemap check", () => {
  const result = auditWith((input) => {
    input.sitemap.push({ ...input.sitemap[0] });
  });
  const sitemap = check(result, "sitemap");
  assert.equal(sitemap.ok, false);
  assert.ok(
    sitemap.failures.some((failure) => failure.includes("listed more than once")),
    sitemap.failures.join("; ")
  );
});

test("a query string in the sitemap fails the sitemap check", () => {
  const result = auditWith((input) => {
    input.sitemap.push({ url: `${SITE_URL}/en/models?page=2` });
  });
  const sitemap = check(result, "sitemap");
  assert.equal(sitemap.ok, false);
  assert.ok(
    sitemap.failures.some((failure) => failure.includes("?page=2") && failure.includes("query string")),
    sitemap.failures.join("; ")
  );
});

test("a model that fails isIndexableModel in the sitemap fails the sitemap check", () => {
  const noindexModel = [...(base.snapshot?.models ?? [])].find((model) => !isIndexableModel(model));
  assert.ok(noindexModel, "the committed snapshot must contain a thin model for this check to be provable");

  const result = auditWith((input) => {
    input.sitemap.push({ url: languageAlternates(modelPath(noindexModel))["en"] });
  });
  const sitemap = check(result, "sitemap");
  assert.equal(sitemap.ok, false);
  assert.ok(
    sitemap.failures.some((failure) => failure.includes("renders noindex") && failure.includes(noindexModel.externalId)),
    sitemap.failures.join("; ")
  );
  assert.equal(result.ok, false, "a noindex URL in the sitemap must exit non-zero");
});

test("an unknown route in the sitemap fails the sitemap check", () => {
  const result = auditWith((input) => {
    input.sitemap.push({ url: `${SITE_URL}/en/m/definitely-not-a-model` });
  });
  const sitemap = check(result, "sitemap");
  assert.equal(sitemap.ok, false);
  assert.ok(
    sitemap.failures.some((failure) => failure.includes("definitely-not-a-model") && failure.includes("404s")),
    sitemap.failures.join("; ")
  );
});

test("dropping a passing model from the sitemap fails the index-policy check", () => {
  /* The audit samples the first indexable model in slug order; pick the same one
     so the failure names the model path and not only the locator count. */
  const passingModel = [...(base.snapshot?.models ?? [])]
    .sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
    .find((model) => isIndexableModel(model));
  assert.ok(passingModel, "the committed snapshot must contain an indexable model");

  const result = auditWith((input) => {
    const urls = new Set(Object.values(languageAlternates(modelPath(passingModel))));
    input.sitemap = input.sitemap.filter((entry) => !urls.has(entry.url));
  });
  const policy = check(result, "index-policy");
  assert.equal(policy.ok, false);
  assert.ok(
    policy.failures.some((failure) =>
      failure.includes("passes the index predicate but is absent") && failure.includes(modelPath(passingModel))
    ),
    policy.failures.join("; ")
  );
});

test("robots without the /api/ disallow fails the robots check", () => {
  const result = auditWith((input) => {
    input.robots = {
      rules: [{ userAgent: "*", allow: "/", disallow: [] }],
      sitemap: `${SITE_URL}/sitemap.xml`
    };
  });
  const robots = check(result, "robots");
  assert.equal(robots.ok, false);
  assert.ok(
    robots.failures.some((failure) => failure.includes("does not disallow /api/")),
    robots.failures.join("; ")
  );
});

test("robots without the sitemap URL fails the robots check", () => {
  const result = auditWith((input) => {
    input.robots = { rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }] };
  });
  const robots = check(result, "robots");
  assert.equal(robots.ok, false);
  assert.ok(
    robots.failures.some((failure) => failure.includes("expected") && failure.includes("/sitemap.xml")),
    robots.failures.join("; ")
  );
});

/* §14 Q2 (v3, "allow search only"): the audit has to fail when the deny groups
   are missing or when one of them catches a search engine. */
test("robots without the training-crawler deny groups fails the robots check", () => {
  const result = auditWith((input) => {
    const rules = Array.isArray(input.robots.rules) ? input.robots.rules : [input.robots.rules ?? {}];
    input.robots = {
      rules: rules.filter((rule) => !asList(rule.userAgent).includes("GPTBot")),
      sitemap: input.robots.sitemap
    };
  });
  const robots = check(result, "robots");
  assert.equal(robots.ok, false);
  assert.ok(
    robots.failures.some((failure) => failure.includes("GPTBot") && failure.includes("Q2")),
    robots.failures.join("; ")
  );
  assert.equal(result.ok, false, "a missing deny group must exit non-zero");
});

test("robots that deny a search engine fails the robots check", () => {
  const result = auditWith((input) => {
    input.robots = {
      rules: [
        { userAgent: "*", allow: "/", disallow: ["/api/"] },
        ...(Array.isArray(input.robots.rules)
          ? input.robots.rules.filter((rule) => Array.isArray(rule.userAgent) && rule.userAgent.includes("CCBot"))
          : []),
        { userAgent: ["Googlebot"], disallow: "/" }
      ],
      sitemap: input.robots.sitemap
    };
  });
  const robots = check(result, "robots");
  assert.equal(robots.ok, false);
  assert.ok(
    robots.failures.some((failure) => failure.includes("Googlebot") && failure.includes("Q2")),
    robots.failures.join("; ")
  );
  assert.equal(result.ok, false, "a denied search engine must exit non-zero");
});

/** Local mirror of the audit's own list helper; the test only reads strings. */
function asList(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}
