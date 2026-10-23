# Kategori kuralları (TR)

Kurallar `src/lib/classify/rules.ts` içinde ve `categories.match_rules` (JSONB) kolonunda yaşar → deploy'suz ayarlanabilir. `category_overrides` manuel kaçış kapısıdır.

| Key | EN | TR | Kural |
|---|---|---|---|
| llm | Language / LLM | Dil / LLM | `pipeline_tag = text-generation` |
| image | Image | Görüntü | `text-to-image`, `image-generation`, `image-to-image`, `image-editing` |
| video | Video | Video | `text-to-video`, `image-to-video`, `video-generation`, `video-to-video` |
| coding | Coding | Kod | name/tag regex (`code`, `coder`, `codex`, `coding`, `swe`, `agentic`) - HF'de böyle bir pipeline_tag yok |
| audio | Audio | Ses | `automatic-speech-recognition`, `text-to-speech`, `audio-to-text`, `music-generation`, `audio-classification` |
| multimodal | Multimodal | Çoklu Mod | `visual-question-answering`, `image-to-text`, `document-question-answering` |
| embedding | Embedding / RAG | Gömme / RAG | `feature-extraction`, `sentence-similarity`, reranker tag |
| vision | Vision / CV | Görme / CV | `object-detection`, `image-segmentation`, `depth-estimation`, `zero-shot-image-classification`, `image-classification` |
| robotics | Robotics / Agent | Robotik / Agent | `robotics`, `visual-document-retrieval`, function-calling tag |
| news | Haber | Haber | daily papers + türetilmiş release |

**Öncelik** (`PRIMARY_PRECEDENCE`): coding > video > image > audio > multimodal > embedding > vision > robotics > llm. `pipeline_tag = text-generation` olan bir kod modeli Coding'e düşmeli, Language'e değil.

Regresyon kapısı: `npm run classify-check` (40 fixture, `tests/fixtures/classify-fixtures.json`).
