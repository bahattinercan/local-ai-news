import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dedupeRepeatedPrefix,
  isBuildTag,
  newsText,
  stripUrls,
  subjectOf,
  truncateAtWord
} from "../src/lib/news-text.ts";

/** Real row from the served snapshot: the title is a build tag, the subject is in the body. */
const LLAMA_CPP = {
  kind: "runtime",
  title: "b11699",
  summary:
    "common: honor HTTP_PROXY/HTTPS_PROXY env vars in http client (#21752) common: honor HTTP_PROXY/HTTPS_PROXY env vars in http client common_http_client() was ignoring standard proxy env vars, causing downloads via -hf and hf.co links to fail behind a proxy. See https://github.com/ggml-org/llama.cpp/attestations/56626981"
};

const REDDIT = {
  kind: "community",
  title: "Tyger: open-weights streaming ASR + full-duplex turn-control in one model",
  summary:
    "Hi r/LocalLLaMA, we're releasing Tyger. Every 80 ms it decides whether the user is still speaking. Repo: https://github.com/example/tyger and a demo at https://example.com/demo"
};

test("a build tag becomes the subject of the body", () => {
  const { title, body, buildTag } = newsText(LLAMA_CPP);
  assert.equal(isBuildTag(LLAMA_CPP.title), true);
  assert.equal(buildTag, "b11699");
  assert.equal(title, "common: honor HTTP_PROXY/HTTPS_PROXY env vars in http client");
  // The subject is not printed a second time inside the body.
  assert.equal(body.split("common: honor HTTP_PROXY/HTTPS_PROXY env vars in http client").length - 1, 0);
  assert.match(body, /^common_http_client\(\) was ignoring standard proxy env vars/);
  assert.equal(body.includes("https://"), false);
  // The dangling "See" left behind by the removed URL is cleaned up.
  assert.equal(/see\s*\.?$/i.test(body), false);
});

test("a real title is kept and a trailing issue reference is dropped", () => {
  assert.equal(newsText(REDDIT).title, REDDIT.title);
  assert.equal(newsText({ ...REDDIT, title: "Granite Switch Decision (#30676)" }).title, "Granite Switch Decision");
  assert.equal(newsText({ ...REDDIT, title: "Granite Switch Decision (#30676)" }).buildTag, null);
});

test("the body loses its URLs but keeps its sentences", () => {
  const { body } = newsText(REDDIT);
  assert.equal(body.includes("http"), false);
  assert.match(body, /^Hi r\/LocalLLaMA, we're releasing Tyger\./);
});

test("markdown links keep their label, bare URLs disappear", () => {
  assert.equal(stripUrls("see [the docs](https://example.com/x) now"), "see the docs now");
  assert.equal(stripUrls("repo https://github.com/example/tyger is live"), "repo is live");
});

test("truncation never cuts a word in half", () => {
  assert.equal(truncateAtWord("short text", 40), "short text");
  const cut = truncateAtWord("alpha beta gamma delta epsilon", 18);
  assert.equal(cut.endsWith("…"), true);
  assert.ok("alpha beta gamma delta epsilon".startsWith(cut.slice(0, -1)));
});

test("a repeated prefix collapses to its second occurrence", () => {
  const subject = "common: honor HTTP_PROXY env vars in http client";
  assert.equal(dedupeRepeatedPrefix(`${subject} ${subject} body follows`), `${subject} body follows`);
  assert.equal(dedupeRepeatedPrefix("a short one"), "a short one");
});

test("subjectOf cuts at the issue reference, otherwise at the first sentence", () => {
  assert.equal(subjectOf("fix the loader (#42) and then everything else"), "fix the loader");
  assert.equal(subjectOf("A short sentence. Another one follows."), "A short sentence.");
});

test("a missing summary never produces an empty title without a body", () => {
  const empty = newsText({ kind: "release", title: "b11699", summary: null });
  assert.equal(empty.title, "");
  assert.equal(empty.body, "");
  assert.equal(empty.buildTag, "b11699");
});

/** Real row: the build tag is a prefix on a usable subject. */
test("a build-tag prefix is split into the label and the subject", () => {
  const { title, buildTag } = newsText({
    kind: "runtime",
    title: "b11700: model : Granite Switch Decision (#30676)",
    summary: "feat(convert): Add decision.chat to support decision models that can also chat"
  });
  assert.equal(buildTag, "b11700");
  assert.equal(title, "model : Granite Switch Decision");
});
