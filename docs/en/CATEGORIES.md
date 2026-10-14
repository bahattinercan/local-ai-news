# Category rules (EN)

Rules live in `src/lib/classify/rules.ts` and in `categories.match_rules` (JSONB) so they can be tuned without a deploy. `category_overrides` is the manual escape hatch.

| Key | EN | TR | Rule |
|---|---|---|---|
| llm | Language / LLM | Dil / LLM | `pipeline_tag = text-generation` |
| image | Image | Görüntü | `text-to-image`, `image-generation`, `image-to-image`, `image-editing` |
| video | Video | Video | `text-to-video`, `image-to-video`, `video-generation`, `video-to-video` |
| coding | Coding | Kod | name/tag regex (`code`, `coder`, `codex`, `coding`, `swe`, `agentic`) — no HF pipeline_tag exists |
| audio | Audio | Ses | `automatic-speech-recognition`, `text-to-speech`, `audio-to-text`, `music-generation`, `audio-classification` |
| multimodal | Multimodal | Çoklu Mod | `visual-question-answering`, `image-to-text`, `document-question-answering` |
| embedding | Embedding / RAG | Embedding / RAG | `feature-extraction`, `sentence-similarity`, reranker tag |
| vision | Vision / CV | Görü | `object-detection`, `image-segmentation`, `depth-estimation`, `zero-shot-image-classification`, `image-classification` |
| robotics | Robotics / Agent | Robotik / Agent | `robotics`, `visual-document-retrieval`, function-calling tag |
| news | News | Haber | daily papers + derived releases |

**Precedence** (`PRIMARY_PRECEDENCE`): coding > video > image > audio > multimodal > embedding > vision > robotics > llm. A coding model with `pipeline_tag = text-generation` must land in Coding, not Language.

Regression gate: `npm run classify-check` (40 fixtures, `tests/fixtures/classify-fixtures.json`).
