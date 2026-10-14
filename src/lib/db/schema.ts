import {
  bigint,
  bigserial,
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  smallint,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const sources = pgTable("sources", {
  key: text("key").primaryKey(),
  baseUrl: text("base_url").notNull(),
  tier: smallint("tier").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  lastStatus: integer("last_status"),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  note: text("note")
});

export const categories = pgTable("categories", {
  key: text("key").primaryKey(),
  labelEn: text("label_en").notNull(),
  labelTr: text("label_tr").notNull(),
  matchRules: jsonb("match_rules").notNull(),
  sortOrder: smallint("sort_order").notNull()
});

export const models = pgTable(
  "models",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    sourceKey: text("source_key").notNull(),
    externalId: text("external_id").notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    author: text("author"),
    authorAvatar: text("author_avatar"),
    primaryCategory: text("primary_category").notNull(),
    pipelineTag: text("pipeline_tag"),
    libraryName: text("library_name"),
    license: text("license"),
    licenseName: text("license_name"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull(),
    downloads: integer("downloads"),
    likes: integer("likes"),
    trendingScore: integer("trending_score"),
    gated: boolean("gated"),
    qualityPassed: boolean("quality_passed").notNull().default(false),
    gateReason: text("gate_reason"),
    paramsTotal: bigint("params_total", { mode: "number" }),
    paramDtypes: jsonb("param_dtypes"),
    storageBytes: bigint("storage_bytes", { mode: "number" }),
    quantizations: jsonb("quantizations"),
    runners: jsonb("runners"),
    vramEstGb: real("vram_est_gb"),
    sampleImages: jsonb("sample_images"),
    spaces: jsonb("spaces"),
    url: text("url").notNull()
  },
  (table) => [unique("models_source_external_uid").on(table.sourceKey, table.externalId)]
);

export const modelCategories = pgTable(
  "model_categories",
  {
    modelId: bigint("model_id", { mode: "number" }).notNull(),
    categoryKey: text("category_key").notNull()
  },
  (table) => [primaryKey({ columns: [table.modelId, table.categoryKey] })]
);

export const modelTags = pgTable(
  "model_tags",
  {
    modelId: bigint("model_id", { mode: "number" }).notNull(),
    tag: text("tag").notNull()
  },
  (table) => [primaryKey({ columns: [table.modelId, table.tag] })]
);

export const news = pgTable(
  "news",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    sourceKey: text("source_key").notNull(),
    externalId: text("external_id").notNull(),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    thumbnail: text("thumbnail"),
    url: text("url").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    organization: text("organization"),
    upvotes: integer("upvotes"),
    modelId: bigint("model_id", { mode: "number" }),
    categoryKey: text("category_key")
  },
  (table) => [unique("news_source_external_uid").on(table.sourceKey, table.externalId)]
);

export const categoryOverrides = pgTable("category_overrides", {
  externalId: text("external_id").primaryKey(),
  categoryKey: text("category_key").notNull(),
  note: text("note")
});

export const ingestRuns = pgTable("ingestRuns", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  sourceKey: text("source_key").notNull(),
  itemsTotal: integer("items_total").notNull().default(0),
  itemsNew: integer("items_new").notNull().default(0),
  itemsGatePassed: integer("items_gate_passed").notNull().default(0),
  requestsUsed: integer("requests_used").notNull().default(0),
  error: text("error")
});

export type ModelRow = typeof models.$inferSelect;
export type NewsRow = typeof news.$inferSelect;
