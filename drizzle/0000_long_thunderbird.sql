CREATE TABLE "categories" (
	"key" text PRIMARY KEY NOT NULL,
	"label_en" text NOT NULL,
	"label_tr" text NOT NULL,
	"match_rules" jsonb NOT NULL,
	"sort_order" smallint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "category_overrides" (
	"external_id" text PRIMARY KEY NOT NULL,
	"category_key" text NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "ingestRuns" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"source_key" text NOT NULL,
	"items_total" integer DEFAULT 0 NOT NULL,
	"items_new" integer DEFAULT 0 NOT NULL,
	"items_gate_passed" integer DEFAULT 0 NOT NULL,
	"requests_used" integer DEFAULT 0 NOT NULL,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "model_categories" (
	"model_id" bigint NOT NULL,
	"category_key" text NOT NULL,
	CONSTRAINT "model_categories_model_id_category_key_pk" PRIMARY KEY("model_id","category_key")
);
--> statement-breakpoint
CREATE TABLE "model_tags" (
	"model_id" bigint NOT NULL,
	"tag" text NOT NULL,
	CONSTRAINT "model_tags_model_id_tag_pk" PRIMARY KEY("model_id","tag")
);
--> statement-breakpoint
CREATE TABLE "models" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"source_key" text NOT NULL,
	"external_id" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"author" text,
	"author_avatar" text,
	"primary_category" text NOT NULL,
	"pipeline_tag" text,
	"library_name" text,
	"license" text,
	"license_name" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"first_seen_at" timestamp with time zone NOT NULL,
	"downloads" integer,
	"likes" integer,
	"trending_score" integer,
	"gated" boolean,
	"quality_passed" boolean DEFAULT false NOT NULL,
	"gate_reason" text,
	"params_total" bigint,
	"param_dtypes" jsonb,
	"storage_bytes" bigint,
	"quantizations" jsonb,
	"runners" jsonb,
	"vram_est_gb" real,
	"sample_images" jsonb,
	"spaces" jsonb,
	"url" text NOT NULL,
	CONSTRAINT "models_source_external_uid" UNIQUE("source_key","external_id")
);
--> statement-breakpoint
CREATE TABLE "news" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"source_key" text NOT NULL,
	"external_id" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"thumbnail" text,
	"url" text NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"organization" text,
	"upvotes" integer,
	"model_id" bigint,
	"category_key" text,
	CONSTRAINT "news_source_external_uid" UNIQUE("source_key","external_id")
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"key" text PRIMARY KEY NOT NULL,
	"base_url" text NOT NULL,
	"tier" smallint NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_status" integer,
	"last_run_at" timestamp with time zone,
	"note" text
);
