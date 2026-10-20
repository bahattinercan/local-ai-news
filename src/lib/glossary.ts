/**
 * Bilingual glossary.
 *
 * Both languages live in ONE object per entry, so `{ en, tr }` is required by the
 * type and a missing translation is a compile error. Two parallel files would be
 * the repo's usual mirror pattern, but those can drift silently; this cannot.
 *
 * Several entries carry facts this project measured itself (see
 * docs/en/NEWS-PLAN.md §8) rather than repeating folklore: the GGUF parameter
 * gap, the KV-cache growth, and why a repository's size is not its weight size.
 */

export type GlossaryCategory = "concepts" | "formats" | "hardware" | "architecture";

/**
 * One measured line a term can show from the served snapshot.
 *
 * The number itself is never stored here: `getGlossaryEvidence()` derives it from
 * the cached snapshot at request time, so an ingest cannot silently falsify a page
 * (docs/en/GLOSSARY-PLAN.md G-D6).
 */
export type GlossaryStat =
  | "quantizations"
  | "runners"
  | "library"
  | "params"
  | "gate"
  | "downloads"
  | "storage"
  | "gated";

/** A table or tool the entry can render instead of retyping its numbers (G-D7). */
export type GlossaryWidget = "quantization-table" | "vram-calculator";

/** Where to see the thing in the model index; `query` is a `/models` query string. */
export interface GlossaryExplore {
  label: { en: string; tr: string };
  query: string;
}

export interface GlossaryText {
  term: string;
  summary: string;
  body: string[];
}

export interface GlossaryEntry {
  slug: string;
  category: GlossaryCategory;
  /** Required in both languages on purpose — see the file comment. */
  en: GlossaryText;
  tr: GlossaryText;
  related: string[];
  /** Other spellings a reader may type, in both languages. */
  aliases?: { en: string[]; tr: string[] };
  /** The snapshot figure this entry is about; rendered with its denominator. */
  stat?: GlossaryStat;
  /** A real table/tool this entry renders instead of restating constants. */
  widget?: GlossaryWidget;
  /** Worked examples computed with `estimateVramGb` instead of quoted in prose. */
  examples?: Array<{ params: number; quantization: string; context: number }>;
  /** Honest entry points into the model index (only where a filter answers it). */
  explore?: GlossaryExplore[];
}

export const GLOSSARY_CATEGORIES: Record<GlossaryCategory, { en: string; tr: string }> = {
  concepts: { en: "Concepts", tr: "Kavramlar" },
  formats: { en: "File formats", tr: "Dosya formatları" },
  hardware: { en: "Hardware", tr: "Donanım" },
  architecture: { en: "Architecture", tr: "Mimari" }
};

export const GLOSSARY: GlossaryEntry[] = [
  {
    slug: "quantization",
    category: "formats",
    related: ["vram", "gguf", "safetensors"],
    aliases: { en: ["quant", "q4", "q8", "precision"], tr: ["kuantizasyon", "quantization", "nicemleme"] },
    stat: "quantizations",
    widget: "quantization-table",
    en: {
      term: "Quantization",
      summary: "Storing a model's weights at lower precision so it takes less space and memory.",
      body: [
        "A model is a large pile of numbers. By default those numbers are stored at high precision — BF16 uses two bytes per parameter, FP32 four. Quantization rewrites them into a coarser representation: fewer bits per number, so a smaller file and less {vram} to run it.",
        "The names encode the scheme and the bits. `Q8_0` is roughly one byte per parameter, `Q4_K_M` is roughly half a byte, `Q2_K` about a third. The suffix matters: `Q4_K_M` and `Q4_K_S` target the same size but spend their error budget differently, and the `_K` variants quantize in blocks so important tensors keep more precision.",
        "The trade is quality for size, and it is not linear. Going from BF16 to 8 bits is usually hard to notice; going below 4 bits starts to cost reasoning, instruction-following and long-context coherence, and the damage differs by model family. There is no universally safe choice, which is why a repository often ships several quantizations of the same weights, most of them as {gguf} files."
      ]
    },
    tr: {
      term: "Kuantizasyon",
      summary: "Model ağırlıklarını daha düşük hassasiyette saklayıp daha az yer ve bellek kullanmak.",
      body: [
        "Model, çok sayıda sayıdan oluşan bir yığındır. Bu sayılar varsayılan olarak yüksek hassasiyette saklanır — BF16 parametre başına iki bayt, FP32 dört bayt. Kuantizasyon sayıları daha kaba bir gösterime çevirir: sayı başına daha az bit, yani daha küçük dosya ve çalıştırmak için daha az {vram}.",
        "İsimler şemayı ve bit sayısını kodlar. `Q8_0` kabaca parametre başına bir bayt, `Q4_K_M` yarım bayt, `Q2_K` üçte bir. Sonek önemlidir: `Q4_K_M` ve `Q4_K_S` aynı boyutu hedefler ama hata bütçesini farklı harcar; `_K` varyantları bloklar hâlinde kuantize eder, böylece önemli tensörler daha fazla hassasiyet korur.",
        "Takas kalite karşılığı boyuttur ve doğrusal değildir. BF16'dan 8 bit'e inmek genelde fark edilmez; 4 bitin altı akıl yürütme, talimat takibi ve uzun bağlam tutarlılığını bozmaya başlar ve hasar model ailesine göre değişir. Evrensel güvenli bir seçim yoktur; bu yüzden bir repo sıklıkla aynı ağırlıkların birkaç kuantizasyonunu, çoğu zaman {gguf} dosyası olarak yayınlar."
      ]
    }
  },
  {
    slug: "vram",
    category: "hardware",
    related: ["quantization", "context-window", "gguf"],
    aliases: { en: ["video memory", "gpu memory"], tr: ["ekran kartı belleği", "gpu belleği"] },
    widget: "vram-calculator",
    examples: [
      { params: 12e9, quantization: "Q4_K_M", context: 4096 },
      { params: 12e9, quantization: "Q4_K_M", context: 32768 },
      { params: 70e9, quantization: "Q4_K_M", context: 4096 }
    ],
    en: {
      term: "VRAM",
      summary: "GPU memory a model needs to run — weights plus the KV cache, not just the file size.",
      body: [
        "The file size is the floor, not the answer. To serve a model the runtime has to hold the weights plus a per-token cache of attention state (the KV cache), plus a working overhead. That is why an 8 GB model can still need more than 8 GB of video memory.",
        "Weights scale with the parameter count and the {quantization}, KV cache scales with the parameter count and the context length. This site's estimator is `params x bytes_per_param + kv`, where the KV term is anchored at roughly 1 GB per 7B parameters at a 4096-token context and grows linearly with the context.",
        "The worked examples below are computed from that estimator — the same one the model pages use — rather than copied into this paragraph. They are one 12B model at two context lengths and a 70B, which is enough to show that the KV cache, not the weights, is what makes a long context expensive.",
        "Treat all of it as an estimate. The KV size depends on the number of layers, the number of KV heads and the dtype the runtime chooses, none of which are visible in the repository metadata, and offloading some layers to system RAM changes the picture entirely."
      ]
    },
    tr: {
      term: "VRAM",
      summary: "Modelin çalışması için gereken ekran kartı belleği — sadece dosya boyutu değil, ağırlıklar artı KV önbelleği.",
      body: [
        "Dosya boyutu taban çizgidir, cevap değil. Çalıştırmak için ağırlıklar artı token başına attention durumu önbelleği (KV önbelleği) artı çalışma payı gerekir. 8 GB'lık bir modelin neden 8 GB'dan fazla ekran kartı belleği isteyebildiğinin sebebi budur.",
        "Ağırlıklar parametre sayısı ve {quantization} ile ölçeklenir; KV önbelleği parametre sayısı ve bağlam uzunluğuyla. Bu sitenin tahmini `parametre x bayt/parametre + kv`; KV terimi 4096 token bağlamda 7B parametre başına yaklaşık 1 GB olarak kalibre edildi ve bağlamla doğrusal büyür.",
        "Aşağıdaki örnekler bu paragrafa kopyalanmaz, o tahminleyiciden — model sayfalarının kullandığı aynı tahminleyiciden — hesaplanır. Üç satır, aynı 12B modelin iki bağlam uzunluğu ve bir 70B'dir; uzun bağlamı pahalı yapanın ağırlıklar değil KV önbelleği olduğunu göstermeye yeter.",
        "Hepsini tahmin olarak gör. KV boyutu katman sayısına, KV head sayısına ve çalışma zamanının seçtiği dtype'a bağlıdır; bunların hiçbiri repo metadatasında görünmez, ayrıca katmanların bir kısmını sistem RAM'ine taşımak tabloyu tamamen değiştirir."
      ]
    }
  },
  {
    slug: "context-window",
    category: "hardware",
    related: ["vram", "quantization"],
    aliases: { en: ["context", "context length", "token limit"], tr: ["bağlam", "bağlam uzunluğu", "context"] },
    en: {
      term: "Context window",
      summary: "How many tokens the model can attend to at once, and the main driver of memory growth.",
      body: [
        "The context window is the maximum number of tokens (roughly, word pieces) the model can consider in a single pass: the prompt, the conversation so far and the answer it is producing. Older models topped out at a few thousand tokens; current ones advertise 128k or more.",
        "A larger window is not free. Attention state is cached for every token in the window, so memory grows linearly with it while the weights stay fixed. That is why the same model can run comfortably in one setup and not another purely because of the context setting.",
        "It is also not automatically useful. Quality over long contexts often degrades well before the advertised limit — information in the middle of a very long prompt is measurably harder for many models to use than information at the start or the end.",
        "Practically: if a model does not fit, try a smaller context before reaching for a more aggressive {quantization}. It costs nothing in weight precision and often saves more memory than dropping a quantization step."
      ]
    },
    tr: {
      term: "Bağlam penceresi",
      summary: "Modelin tek seferde dikkate alabileceği token sayısı ve bellek büyümesinin ana sebebi.",
      body: [
        "Bağlam penceresi modelin tek geçişte değerlendirebileceği en fazla token sayısıdır (kabaca kelime parçaları): istem, o ana kadarki konuşma ve üretmekte olduğu yanıt. Eski modeller birkaç bin tokenla sınırlıydı; yenileri 128k ve üzerini duyuruyor.",
        "Büyük pencere bedava değil. Penceredeki her token için attention durumu önbelleğe alınır, yani bellek doğrusal büyürken ağırlıklar sabit kalır. Aynı modelin bir kurulumda rahat, diğerinde sığmamasının sebebi sadece bağlam ayarıdır.",
        "Ayrıca otomatik olarak faydalı da değildir. Uzun bağlamlarda kalite, duyurulan sınıra varmadan bozulur; çok uzun bir istemin ortasındaki bilgiyi kullanmak, başındaki veya sonundaki bilgiye göre ölçülebilir biçimde daha zordur.",
        "Pratikte: model sığmıyorsa daha agresif {quantization} seçmeden önce bağlamı küçültmeyi dene. Ağırlık hassasiyetine hiçbir maliyeti yoktur ve çoğu zaman bir kuantizasyon kademesi düşürmekten daha fazla bellek kazandırır."
      ]
    }
  },
  {
    slug: "gguf",
    category: "formats",
    related: ["quantization", "params", "safetensors"],
    aliases: { en: ["llama.cpp format", "gguf file"], tr: ["llama.cpp formatı", "gguf dosyası"] },
    stat: "library",
    explore: [{ label: { en: "Repositories that ship GGUF", tr: "GGUF yayan depolar" }, query: "/models?runner=llama.cpp" }],
    en: {
      term: "GGUF",
      summary: "llama.cpp's single-file format, and why these repositories rarely have a parameter count.",
      body: [
        "GGUF is the file format llama.cpp reads. It packs the weights, the tokenizer and the metadata into one file, and it is the usual way a quantized model is distributed for local use. A single repository often ships the same model at half a dozen quantizations, each as its own `.gguf`.",
        "That packaging is why this site can list exact file sizes for GGUF models: the repository's file listing carries a name and a byte count per quantization, so you can see that `Q8_0` is 5.99 GB and `Q6_K` is 4.67 GB and decide what fits.",
        "It is also why the parameter count is usually missing. That number normally comes from the model's {safetensors} metadata, which GGUF files do not have. Measured across this site's snapshot: no GGUF repository reports a parameter count, while most of them do report which quantizations exist. The figures under the definition are read from the current snapshot, not typed into this sentence.",
        "So for GGUF models the useful answer is not \"how many parameters\" but \"which file fits\". The model pages show the file table for exactly this reason, and the VRAM calculator accepts a typed-in parameter count when none is stored."
      ]
    },
    tr: {
      term: "GGUF",
      summary: "llama.cpp'nin tek dosyalı formatı ve bu repolarda parametre sayısının neden çoğu zaman olmadığı.",
      body: [
        "GGUF, llama.cpp'nin okuduğu dosya formatıdır. Ağırlıkları, tokenizer'ı ve metadatayı tek dosyada toplar ve kuantize bir modelin yerel kullanım için dağıtılmasının olağan yoludur. Bir repo sıklıkla aynı modeli yarım düzine kuantizasyonda, her biri kendi `.gguf` dosyası olarak yayınlar.",
        "Bu paketleme, sitemizin GGUF modelleri için tam dosya boyutlarını listeleyebilmesinin sebebidir: repo dosya listesi her kuantizasyon için ad ve bayt sayısı taşır; böylece `Q8_0`'ın 5.99 GB, `Q6_K`'nın 4.67 GB olduğunu görüp neyin sığacağına karar verebilirsin.",
        "Parametre sayısının genelde eksik olmasının sebebi de budur. O sayı normalde modelin {safetensors} metadatasından gelir; GGUF dosyalarında bu yok. Bu sitenin snapshot'ında ölçüldü: hiçbir GGUF reposu parametre sayısı bildirmiyor, ama çoğu hangi kuantizasyonların bulunduğunu bildiriyor. Tanımın altındaki sayılar bu cümleye yazılmadı, güncel snapshot'tan okunuyor.",
        "Yani GGUF modellerinde faydalı cevap \"kaç parametre\" değil, \"hangi dosya sığıyor\". Model sayfaları tam bu yüzden dosya tablosunu gösteriyor ve VRAM hesaplayıcı, kayıtlı sayı yoksa elle girilen değeri kabul ediyor."
      ]
    }
  },
  {
    slug: "safetensors",
    category: "formats",
    related: ["gguf", "quantization", "params"],
    aliases: { en: ["safetensor", "hf weights"], tr: ["safetensor", "hf formatı"] },
    en: {
      term: "Safetensors",
      summary: "The Hugging Face default weight format, and where a reliable parameter count comes from.",
      body: [
        "Safetensors is a simple container for tensors designed to be safe to load and fast to memory-map. It is the default distribution format on Hugging Face for PyTorch, diffusers and most fine-tunes, usually as one or a few `.safetensors` files plus a config.",
        "Because it is a structured container, the hosting platform can read the tensor shapes without downloading the weights. That is where the parameter count, and the per-dtype breakdown, comes from — the metadata lists how many parameters exist at BF16, FP8, INT8 and so on.",
        "That distinction decides what this site can show. A model stored as safetensors has a real parameter count ({params}), so the VRAM calculator can prefill it; a model shipped only as {gguf} does not, so it has to be entered by hand.",
        "It also means the count is exact rather than inferred — and it is why this site refuses to guess the count from a repository's total size, which was measured to be wrong by up to 108x because that total includes every file, not just the weights."
      ]
    },
    tr: {
      term: "Safetensors",
      summary: "Hugging Face'in varsayılan ağırlık formatı ve güvenilir parametre sayısının kaynağı.",
      body: [
        "Safetensors, tensörler için yüklenmesi güvenli ve belleğe hızlı eşlenebilir olacak şekilde tasarlanmış basit bir kapsayıcıdır. Hugging Face'te PyTorch, diffusers ve çoğu fine-tune için varsayılan dağıtım formatıdır; genelde bir veya birkaç `.safetensors` dosyası artı bir config.",
        "Yapılandırılmış bir kapsayıcı olduğu için barındırma platformu tensör şekillerini ağırlıkları indirmeden okuyabilir. Parametre sayısı ve dtype kırılımı buradan gelir — metadata kaç parametrenin BF16, FP8, INT8 vb. olduğunu listeler.",
        "Bu ayrım sitemizin neyi gösterebileceğini belirler. Safetensors olarak saklanan bir modelin gerçek bir parametre sayısı ({params}) vardır, yani VRAM hesaplayıcı onu önceden doldurabilir; yalnızca {gguf} olarak yayınlanan modelde yoktur, elle girilmesi gerekir.",
        "Ayrıca sayının çıkarım değil kesin olduğu anlamına gelir — ve sitemizin sayıyı repo toplam boyutundan tahmin etmeyi reddetmesinin sebebi budur; o toplam sadece ağırlıkları değil her dosyayı içerdiği için ölçümde 108 kata kadar yanlış çıktı."
      ]
    }
  },
  {
    slug: "params",
    category: "concepts",
    related: ["quantization", "vram", "gguf", "safetensors"],
    aliases: { en: ["parameter count", "size", "b"], tr: ["parametre", "parametre sayısı", "boyut"] },
    stat: "params",
    explore: [{ label: { en: "Models inside an 8B budget", tr: "8B bütçeye sığan modeller" }, query: "/models?maxParams=8" }],
    en: {
      term: "Parameters (B)",
      summary: "The number of learned weights, written in billions — and what it does and does not tell you.",
      body: [
        "A parameter is one learned number in the model. Counts are quoted in billions, so \"7B\" means roughly seven billion of them. It is the single most useful size signal because VRAM scales directly with it, at a given quantization.",
        "It says much less about capability than the marketing implies. Architecture, training data, training compute and post-training all matter, and a well-trained 9B can beat a hastily trained 30B on real tasks. Parameter count is a size label, not a quality label.",
        "Two conventions are worth knowing. A {moe} model quotes both numbers (`35B3A` means 35B total, 3B active per token), and the active figure is closer to what you pay for compute while the total is closer to what you pay for memory.",
        "This site only shows a parameter count it can source from model metadata, and is explicit when there is none. It is never written from the file size: measured against 51 models that had both, size-derived counts landed within 30% for only 23 of them."
      ]
    },
    tr: {
      term: "Parametre (B)",
      summary: "Öğrenilmiş ağırlık sayısı, milyar cinsinden — neyi söyler, neyi söylemez.",
      body: [
        "Parametre modeldeki öğrenilmiş bir sayıdır. Sayılar milyar cinsinden verilir; yani \"7B\" kabaca yedi milyar demektir. Verili bir kuantizasyonda VRAM doğrudan bununla ölçeklendiği için en faydalı boyut sinyalidir.",
        "Yetenek hakkında ise pazarlamanın ima ettiğinden çok daha az şey söyler. Mimari, eğitim verisi, eğitim hesabı ve eğitim sonrası süreçlerin hepsi önemlidir; iyi eğitilmiş bir 9B, acele eğitilmiş bir 30B'yi gerçek görevlerde geçebilir. Parametre sayısı bir boyut etiketi, kalite etiketi değildir.",
        "İki gösterimi bilmek işe yarar. {moe} bir model iki sayı verir (`35B3A` = toplam 35B, token başına 3B aktif); aktif sayı hesap maliyetine, toplam sayı bellek maliyetine daha yakındır.",
        "Bu site yalnızca model metadatasından kaynaklandırabildiği parametre sayısını gösterir ve yoksa bunu açıkça belirtir. Sayı asla dosya boyutundan yazılmaz: her ikisi de bulunan 51 modelde ölçüldüğünde, boyuttan türetilen sayılar yalnızca 23'ünde ±%30 içinde kaldı."
      ]
    }
  },
  {
    slug: "moe",
    category: "architecture",
    related: ["params", "vram"],
    aliases: { en: ["mixture of experts", "expert"], tr: ["uzman karışımı", "moe"] },
    en: {
      term: "Mixture of experts (MoE)",
      summary: "A model with many expert blocks that activates only a few per token.",
      body: [
        "In a dense model every parameter participates in every token, so compute and memory both scale with the parameter count. A mixture-of-experts model replaces the large feed-forward blocks with many smaller \"experts\" plus a router that sends each token to only a few of them.",
        "The consequence is that the total parameter count and the per-token compute decouple: a model can hold 35B parameters while computing with roughly 3B of them per token. That is why you see shorthand like `35B3A` — 35B total, about 3B active.",
        "Memory is the catch. Every expert has to be resident even though most are idle for any given token, so a MoE model wants memory sized by the total and compute sized by the active count. It is a good fit when memory is plentiful and tokens per second matter, and a poor fit on a small card.",
        "It also affects {quantization} choices: the expert blocks are a large share of the total, so quantizing them aggressively buys more memory than the same change on a dense model, at a quality cost that is debated and architecture-specific."
      ]
    },
    tr: {
      term: "Uzman karışımı (MoE)",
      summary: "Her token için yalnızca birkaç uzman bloğu etkinleştiren, çok sayıda uzman içeren model.",
      body: [
        "Yoğun (dense) bir modelde her parametre her tokenda yer alır, yani hesap da bellek de parametre sayısıyla ölçeklenir. Uzman karışımı bir model büyük ileri-besleme bloklarını çok sayıda küçük \"uzman\" ve her tokenı yalnızca birkaçına gönderen bir yönlendiriciyle değiştirir.",
        "Sonuç, toplam parametre sayısıyla token başına hesabın ayrışmasıdır: bir model 35B parametre taşırken token başına kabaca 3B ile hesap yapabilir. `35B3A` gibi kısaltmaları görmenin sebebi budur — toplam 35B, aktif yaklaşık 3B.",
        "İşin zor kısmı bellektir. Çoğu tokenda boş otursalar da bütün uzmanlar bellekte durmak zorundadır; yani MoE modeli bellek olarak toplam sayıya, hesap olarak aktif sayıya göre boyutlanır. Bellek bolsa ve saniyedeki token önemliyse iyi uyar, küçük bir kartta kötü.",
        "{quantization} seçimini de etkiler: uzman blokları toplamın büyük bir kısmıdır, dolayısıyla onları agresif kuantize etmek yoğun bir modeldeki aynı değişiklikten daha fazla bellek kazandırır; kalite maliyeti tartışmalıdır ve mimariye göre değişir."
      ]
    }
  },
  {
    slug: "lora",
    category: "architecture",
    related: ["params", "safetensors", "quantization"],
    aliases: { en: ["adapter", "fine-tune"], tr: ["adaptör", "lora adaptörü"] },
    explore: [{ label: { en: "Adapters in the index", tr: "Dizindeki adaptörler" }, query: "/models?q=lora" }],
    en: {
      term: "LoRA and adapters",
      summary: "Small add-on weight sets that modify a base model without retraining it.",
      body: [
        "Low-rank adaptation trains a small pair of matrices instead of the whole model, then adds their effect to the frozen original weights, which stay in their original {safetensors} container. The result is an adapter measured in tens or hundreds of megabytes rather than tens of gigabytes, which is why fine-tunes are cheap to produce and share.",
        "An adapter does not stand alone: it needs its base model. A repository page showing a small file next to a large one is usually exactly that pair, and the base model is frequently named in the model card — this site surfaces it as the \"base model\" specification.",
        "Adapters are also why a repository's total size is a bad proxy for the model size. A repo can hold several quantizations, several adapters and training leftovers; the total is the sum of everything, not the weights you would load.",
        "This was measured, not assumed: dividing a repository's total size by bytes-per-parameter matched the real parameter count within 30% for only 23 of 51 models, the worst case being 108x — which is why this site shows a file table and a sourced parameter count instead of a size-derived one."
      ]
    },
    tr: {
      term: "LoRA ve adaptörler",
      summary: "Temel modeli yeniden eğitmeden değiştiren küçük ek ağırlık setleri.",
      body: [
        "Low-rank adaptation, tüm model yerine küçük bir matris çifti eğitir ve etkilerini, kendi {safetensors} kapsayıcısında duran donmuş orijinal ağırlıklara ekler. Sonuç, onlarca gigabayt yerine onlarca yüz megabaytla ölçülen bir adaptördür; fine-tune'ların üretimi ve paylaşımı bu yüzden ucuzdur.",
        "Adaptör tek başına durmaz: temel modeline ihtiyaç duyar. Bir repo sayfasında büyük bir dosyanın yanında küçük bir dosya görüyorsan, genelde tam olarak o çifttir ve temel model sıklıkla model kartında yazılıdır — bu site onu \"temel model\" satırı olarak gösterir.",
        "Adaptörler, bir reponun toplam boyutunun model boyutu için neden kötü bir gösterge olduğunun da sebebidir. Repoda birden fazla kuantizasyon, birden fazla adaptör ve eğitim artığı bulunabilir; toplam her şeyin toplamıdır, yükleyeceğin ağırlıklar değil.",
        "Bu varsayım değil ölçüm: repo toplam boyutunu bayt/parametreye bölmek, gerçek parametre sayısıyla 51 modelin yalnızca 23'ünde ±%30 içinde eşleşti, en kötü sapma 108× çıktı — bu site bu yüzden boyuttan türetilmiş bir sayı yerine dosya tablosu ve kaynaklı parametre sayısı gösteriyor."
      ]
    }
  },
  {
    slug: "quality-gate",
    category: "concepts",
    related: ["first-seen"],
    aliases: { en: ["gate", "noise filter"], tr: ["kapı", "gürültü filtresi", "kalite filtresi"] },
    stat: "gate",
    explore: [
      { label: { en: "Show everything (30 days, one category)", tr: "Her şeyi göster (30 gün, tek kategori)" }, query: "/models?gate=all&category=llm&window=30d" }
    ],
    en: {
      term: "Quality gate",
      summary: "This site's noise filter: what has to be true before a model appears in the feed by default.",
      body: [
        "Hugging Face receives a very large number of uploads, most of which are tests, half-finished fine-tunes or empty repositories. Without a filter the feed would be unusable.",
        "A model passes the gate if at least one of these holds: it has at least 5 likes, at least 50 downloads, comes from a curated organisation, or ships a widget (an interactive preview with sample outputs). Gated repositories that require accepting terms are excluded separately.",
        "The gate is a filter, not a verdict. \"Passed\" means \"not obviously noise yet\", and a model that has just been uploaded needs time to accumulate likes and downloads, so new models legitimately start on the other side of it ({first-seen}). That is what the \"show everything\" toggle is for — it is deliberately restricted to a 30-day window with a category selected, because otherwise the result set explodes.",
        "The gate also decides what counts as a release announcement: a model that passes it and is either trending, well liked or from a curated organisation is worth a news row."
      ]
    },
    tr: {
      term: "Kalite kapısı",
      summary: "Bu sitenin gürültü filtresi: bir modelin varsayılan akışta görünmesi için neyin doğru olması gerektiği.",
      body: [
        "Hugging Face'e çok sayıda yükleme geliyor; çoğu test, yarım kalmış fine-tune veya boş repo. Filtre olmadan akış kullanılamaz hâle gelir.",
        "Bir model şu koşullardan en az biri sağlanırsa kapıyı geçer: en az 5 beğeni, en az 50 indirme, küratörlü bir organizasyondan gelmek veya bir widget (örnek çıktıları olan etkileşimli önizleme) taşımak. Şart kabulü gerektiren gated repolar ayrıca dışlanır.",
        "\"Geçti\" bir hüküm değil, filtredir: \"henüz bariz gürültü değil\" demektir. Yeni yüklenen bir modelin beğeni ve indirme biriktirmesi zaman alır, yani yeni modeller meşru olarak kapının diğer tarafından başlar ({first-seen}). \"Her şeyi göster\" anahtarı bunun içindir — bilinçli olarak 30 günlük pencere ve seçili kategoriyle sınırlıdır, çünkü aksi hâlde sonuç kümesi patlar.",
        "Kapı aynı zamanda neyin sürüm duyurusu sayılacağını belirler: kapıyı geçen ve trend olan, çok beğenilen veya küratörlü bir organizasyondan gelen model bir haber satırı hak eder."
      ]
    }
  },
  {
    slug: "runner",
    category: "hardware",
    related: ["quantization", "gguf", "vram"],
    aliases: { en: ["runtime", "backend", "inference engine"], tr: ["çalıştırıcı", "runtime"] },
    stat: "runners",
    explore: [
      { label: { en: "Runs on llama.cpp", tr: "llama.cpp ile çalışanlar" }, query: "/models?runner=llama.cpp" },
      { label: { en: "Runs on transformers", tr: "transformers ile çalışanlar" }, query: "/models?runner=transformers" }
    ],
    en: {
      term: "Runner",
      summary: "The program that actually loads the weights and generates text or images on your machine.",
      body: [
        "A model is a file; a runner is the program that reads it. Hugging Face tells this site which one a repository is built for — the `library` field and the tags on the repo — which is why a card can say `transformers · llama.cpp`.",
        "They are not interchangeable, and the choice decides the file you need. `llama.cpp` and `Ollama` load {gguf} files and run well on a CPU with optional GPU offload; `vLLM` and `ExLlama` target GPUs and throughput for serving; `MLX` is Apple silicon; `transformers` runs the original safetensors weights through PyTorch; `ComfyUI` is the image/video workflow tool that loads diffusers checkpoints.",
        "So a runner is not a quality ranking. A repository that offers GGUF is not better than one that only ships safetensors — it is usable by a different set of programs. The filter on this site narrows the feed to repositories you can run with the tool you already have.",
        "The run command shown on a model page is generated from this field, which is why it uses the flags of the listed runner rather than a generic example."
      ]
    },
    tr: {
      term: "Runner (çalıştırıcı)",
      summary: "Ağırlıkları yükleyip makinenizde metin veya görsel üreten program.",
      body: [
        "Model bir dosyadır; runner onu okuyan programdır. Hugging Face bu siteye bir deponun hangi program için hazırlandığını bildirir — depodaki `library` alanı ve etiketler — bu yüzden bir kart `transformers · llama.cpp` yazabilir.",
        "Birbirlerinin yerine geçmezler ve seçim, ihtiyacınız olan dosyayı belirler. `llama.cpp` ve `Ollama` {gguf} dosyalarını yükler, CPU'da iyi çalışır ve isteğe bağlı GPU'ya devredebilir; `vLLM` ve `ExLlama` GPU'ya ve sunum verimine yönelir; `MLX` Apple silicon içindir; `transformers` orijinal safetensors ağırlıklarını PyTorch ile çalıştırır; `ComfyUI` diffusers checkpoint'lerini yükleyen görsel/video iş akışı aracıdır.",
        "Yani runner bir kalite sıralaması değildir. GGUF sunan bir depo, yalnızca safetensors yayınlayandan daha iyi değildir — farklı programlar tarafından kullanılabilir. Bu sitedeki filtre, akışı elinizdeki araçla çalıştırabileceğiniz depolara daraltır.",
        "Model sayfasında gösterilen çalıştırma komutu bu alandan üretilir; bu yüzden genel bir örnek yerine listelenen runner'ın kendi bayraklarını kullanır."
      ]
    }
  },
  {
    slug: "first-seen",
    category: "concepts",
    related: ["quality-gate"],
    aliases: { en: ["new", "first seen at"], tr: ["yeni", "ilk görülme"] },
    explore: [{ label: { en: "Newest arrivals", tr: "En yeni gelenler" }, query: "/models?window=24h&sort=new" }],
    en: {
      term: "\"New\" means first seen",
      summary: "How this site decides a model is new, and why the numbers are not real-time.",
      body: [
        "The feed's \"new\" is the moment this site first saw a model, not the moment it was created. The two usually agree within a day because the ingest runs often, but a model uploaded and then made public later is genuinely new to us at first sight.",
        "The pipeline is not live. Data is collected by a scheduled job, published as one snapshot, and the site serves that snapshot with a short server-side cache, so a model can be on Hugging Face for a few minutes before it appears here. The footer shows the snapshot's age, which is the honest number to read.",
        "That cadence is also why the site never says \"real-time\". A refresh interval plus a cache is a freshness guarantee of the same order as those two numbers, and nothing better.",
        "If you need to know when something appeared, use the timestamp shown on the item. If you need it sooner than the refresh interval, the underlying source is one click away on every page."
      ]
    },
    tr: {
      term: "\"Yeni\" = ilk görülme",
      summary: "Bu sitenin bir modeli nasıl yeni saydığı ve sayıların neden gerçek zamanlı olmadığı.",
      body: [
        "Akıştaki \"yeni\", bu sitenin modeli ilk gördüğü andır, oluşturulduğu an değil. Ingest sık çalıştığı için ikisi genelde aynı gün içinde örtüşür; ama sonradan herkese açılan bir model bizim için gerçekten ilk görüşte yenidir.",
        "Hat canlı değil. Veri zamanlanmış bir işle toplanır, tek bir snapshot olarak yayınlanır ve site o snapshot'ı kısa süreli sunucu önbelleğiyle servis eder; yani bir model burada görünmeden önce Hugging Face'te birkaç dakika durmuş olabilir. Altbilgi snapshot'ın yaşını gösterir, okunacak dürüst sayı odur.",
        "Bu ritim, sitenin neden asla \"gerçek zamanlı\" demediğinin de sebebidir. Bir yenileme aralığı artı bir önbellek, tazelik garantisi olarak bu iki sayının mertebesindedir, daha iyisi değil.",
        "Bir şeyin ne zaman çıktığını bilmen gerekiyorsa öğe üzerindeki zaman damgasını kullan. Yenileme aralığından daha erken gerekiyorsa, kaynağın kendisi her sayfadan bir tık uzakta."
      ]
    }
  },
  {
    slug: "library",
    category: "concepts",
    related: ["runner", "gguf", "lora", "safetensors"],
    aliases: { en: ["library_name", "pipeline"], tr: ["kütüphane", "library_name"] },
    stat: "library",
    en: {
      term: "Library",
      summary: "The field that says which code a repository is built for — and why it is not the same as a runner.",
      body: [
        "Hugging Face stores a `library_name` on each repository: `transformers`, `diffusers`, `peft`, `sentence-transformers`, `gguf`, `ultralytics`. It is the author's declaration of the code path that produced the weights — a label, not a quality claim, and this site prints it only because a row has room for one more useful word.",
        "It overlaps with the {runner} without being it. `library_name: gguf` means the repository holds {gguf} files, which `llama.cpp` and `Ollama` can load; `transformers` means the original weights plus a loading config. A repository can declare `transformers` and still publish GGUF files inside, which is why the two fields can disagree without either being wrong.",
        "Coverage is high — the snapshot figure below counts models that declare one at all. The exceptions matter more: a repository without a library is not broken, it just cannot be labelled, and this site leaves the field out rather than guessing it from the file names."
      ]
    },
    tr: {
      term: "Kütüphane",
      summary: "Bir deponun hangi kod için üretildiğini söyleyen alan — ve neden runner ile aynı şey olmadığı.",
      body: [
        "Hugging Face her repoda bir `library_name` saklar: `transformers`, `diffusers`, `peft`, `sentence-transformers`, `gguf`, `ultralytics`. Bu, ağırlıkları üreten kod yolunun yazar beyanıdır — kalite iddiası değil, bir etiket; bu site onu yalnızca satırda bir kelimelik yer varken basar.",
        "{runner} ile örtüşür ama aynı şey değildir. `library_name: gguf`, deponun `llama.cpp` ve `Ollama`'nın yükleyebildiği {gguf} dosyaları tuttuğu anlamına gelir; `transformers` ise orijinal ağırlıklar artı bir yükleme yapılandırması demektir. Bir depo `transformers` bildirip içinde GGUF dosyaları da yayınlayabilir; iki alanın çelişebilmesinin ve ikisinin de yanlış olmamasının sebebi budur.",
        "Kapsam yüksektir — aşağıdaki snapshot sayısı en az bir kütüphane bildiren modelleri sayar. Asıl ilginç olan istisnalar: kütüphanesi olmayan bir depo bozuk değildir, sadece etiketlenemez; bu site alanı dosya adlarından tahmin etmek yerine boş bırakır."
      ]
    }
  },
  {
    slug: "downloads",
    category: "concepts",
    related: ["first-seen", "quality-gate", "storage-size"],
    aliases: { en: ["downloads", "likes", "popularity"], tr: ["indirme", "beğeni", "popülerlik"] },
    stat: "downloads",
    en: {
      term: "Downloads and likes",
      summary: "Cumulative engagement counters, what they can and cannot tell you, and why they carry the weight they do here.",
      body: [
        "`downloads` and `likes` are the two engagement counters Hugging Face exposes per repository. Downloads is a running total of file fetches, not a count of people and not a count of successful runs: one person pulling six quantizations counts six times, and a CI job counts like anyone else.",
        "That makes the absolute number a weak quality signal and a decent popularity one. This site uses downloads as a weight — the ribbon is ordered by it — and prints likes only when they are above zero, because likes are absent on most of the snapshot while downloads are present on most of it. The coverage figures below show the gap rather than hiding it.",
        "There is no history in the snapshot. A \"downloads per day\" figure is cumulative downloads divided by the days since this radar first saw the repository: an average since first sight, not growth since the last snapshot. The compare page prints it that way on purpose, and {first-seen} explains why the denominator starts where it does."
      ]
    },
    tr: {
      term: "İndirme ve beğeni",
      summary: "Kümülatif etkileşim sayaçları, neyi söyleyip neyi söyleyemedikleri ve burada neden ağırlık taşıdıkları.",
      body: [
        "`downloads` ve `likes`, Hugging Face'in repo başına sunduğu iki etkileşim sayacıdır. İndirme, dosya çekmelerinin kümülatif toplamıdır; kişi sayısı değil, başarılı çalıştırma sayısı da değil: altı kuantizasyon indiren bir kişi altı kez sayılır, bir CI işi de herkes gibi sayılır.",
        "Bu yüzden mutlak sayı zayıf bir kalite, makul bir popülerlik sinyalidir. Bu site indirmeyi bir ağırlık olarak kullanır — şerit onunla sıralanır — ve beğeniyi yalnızca sıfırdan büyükse basar; çünkü snapshot'ın çoğunda indirme varken beğeni yoktur. Aşağıdaki kapsam sayıları bu farkı gizlemek yerine gösterir.",
        "Snapshot'ta geçmiş yoktur. \"Günlük indirme\" bu radarın depoyu ilk gördüğü günden bu yana geçen süreye bölünmüş kümülatif indirmedir: ilk görülmeden beri ortalama, son snapshot'tan beri büyüme değil. Karşılaştırma sayfası bunu bilerek böyle basar ve {first-seen} paydanın neden oradan başladığını açıklar."
      ]
    }
  },
  {
    slug: "storage-size",
    category: "formats",
    related: ["quantization", "safetensors", "gguf", "vram"],
    aliases: { en: ["storage", "file size", "weights size"], tr: ["depolama", "dosya boyutu"] },
    stat: "storage",
    en: {
      term: "Storage size",
      summary: "The repository's total weight on Hugging Face — which is not the same as the size of the model.",
      body: [
        "Hugging Face reports `usedStorage` per repository: the bytes of every file in it. That includes the model weights, but also every quantization shipped alongside, adapters, tokenizer files, training leftovers and images. Dividing it by bytes-per-parameter is the obvious way to guess a parameter count — and it measured wrong.",
        "Against 51 models that had both a real parameter count and a stored size, the size-derived count landed within 30 % for only 23 of them; the worst case was off by 108×, because that repository's total included several quantizations and training artefacts rather than one copy of the weights.",
        "So the number next to the hard-drive icon is the repository total, labelled as such, and {params} is never derived from it. For a concrete file size, the {gguf} entry explains why the file table on a model page is the honest answer."
      ]
    },
    tr: {
      term: "Depolama boyutu",
      summary: "Hugging Face'teki depo toplamı — modelin boyutuyla aynı şey değil.",
      body: [
        "Hugging Face her repo için `usedStorage` bildirir: içindeki her dosyanın bayt toplamı. Buna model ağırlıkları girer, ama yanında yayınlanan her kuantizasyon, adaptörler, tokenizer dosyaları, eğitim artıkları ve görseller de girer. Bunu bayt/parametreye bölmek parametre sayısını tahmin etmenin bariz yolu — ve ölçüldüğünde yanlış çıktı.",
        "Hem gerçek parametre sayısı hem kayıtlı boyutu olan 51 modelde, boyuttan türetilen sayı yalnızca 23'ünde ±%30 içinde kaldı; en kötü sapma 108× çıktı, çünkü o deponun toplamı ağırlıkların bir kopyası değil, birkaç kuantizasyon ve eğitim artığı içeriyordu.",
        "Yani sabit disk simgesinin yanındaki sayı depo toplamıdır ve öyle etiketlenir; {params} asla ondan türetilmez. Somut bir dosya boyutu için model sayfasındaki dosya tablosu dürüst cevaptır — {gguf} girişi bunun sebebini açıklar."
      ]
    }
  },
  {
    slug: "gated",
    category: "concepts",
    related: ["quality-gate", "first-seen"],
    aliases: { en: ["gated", "gated repo", "terms"], tr: ["gated", "şartlı depo"] },
    stat: "gated",
    en: {
      term: "Gated repository",
      summary: "A repository whose files sit behind a terms form — and why it is left out of the feed.",
      body: [
        "A gated repository is not a restricted model in the licence sense; it is one whose download button sits behind a form: accept the terms, sometimes wait for the author's approval, and then the files become available. Hugging Face marks the state on the repository and the API surfaces it as a `gated` field.",
        "This site excludes gated repositories from the feed. Not because they are worse, but because \"local\" here means \"you can download it now\": a card that opens a page requiring a permission request is not the same promise as one that opens a file listing.",
        "The count is small — the snapshot figure below is printed rather than described, because it moves. Gated repositories are still tracked, so a count that says \"models in window\" excludes them while the {quality-gate} figures are computed over the whole snapshot: two different denominators, both labelled."
      ]
    },
    tr: {
      term: "Gated depo",
      summary: "Dosyaları bir şartlar formunun arkasında duran depo — ve akıştan neden çıkarıldığı.",
      body: [
        "Gated bir depo, lisans anlamında kısıtlı bir model değildir; indirme düğmesi bir formun arkasındadır: şartları kabul et, bazen yazarın onayını bekle, sonra dosyalar açılır. Hugging Face bu durumu depoda işaretler ve API bunu `gated` alanı olarak sunar.",
        "Bu site gated depoları akıştan çıkarır. Daha kötü oldukları için değil, burada \"yerel\" \"şimdi indirebilirsin\" demek olduğu için: izin talebi gerektiren bir sayfa açan kart, dosya listesi açan kartla aynı vaadi taşımaz.",
        "Sayı küçüktür — aşağıdaki snapshot sayısı tanımla değil, basılarak verilir çünkü değişir. Gated depolar izlenen kümenin parçası olmaya devam eder; yani \"penceredeki model\" diyen bir sayım onları dışarıda bırakırken {quality-gate} sayıları tüm snapshot üzerinden hesaplanır: iki farklı payda, ikisi de etiketli."
      ]
    }
  }
];

export function getGlossaryEntry(slug: string): GlossaryEntry | undefined {
  return GLOSSARY.find((entry) => entry.slug === slug);
}

export function glossaryByCategory(): Array<{ category: GlossaryCategory; entries: GlossaryEntry[] }> {
  const order = Object.keys(GLOSSARY_CATEGORIES) as GlossaryCategory[];
  return order
    .map((category) => ({ category, entries: GLOSSARY.filter((entry) => entry.category === category) }))
    .filter((group) => group.entries.length > 0);
}

/** Locale-aware access so callers never reach into the wrong language. */
export function glossaryText(entry: GlossaryEntry, locale: "en" | "tr"): GlossaryText {
  return locale === "tr" ? entry.tr : entry.en;
}

/* ------------------------------------------------------------------------- *
 * Search, ordering and reading helpers (docs/en/GLOSSARY-PLAN.md G0)
 *
 * All of it is pure and locale-aware. The one trap this file exists to avoid is
 * Turkish casing: `toLowerCase()` maps "I" to "i" and leaves "İ" alone, while a
 * Turkish reader's alphabet has İ/i and I/ı as different letters. `fold()` goes
 * through `toLocaleLowerCase("tr-TR")` first and then flattens both flavours, so
 * "kuantizasyon", "Kuantizasyon" and "KUANTİZASYON" all land in the same bucket.
 * ------------------------------------------------------------------------- */

/** Turkish letters mapped before the generic diacritic strip below. */
const FOLD_MAP: Record<string, string> = { ı: "i", İ: "i", ç: "c", ğ: "g", ö: "o", ş: "s", ü: "u" };

/** Case- and accent-insensitive form used for matching only — never for display. */
export function fold(text: string, locale: "en" | "tr"): string {
  return text
    .toLocaleLowerCase(locale === "tr" ? "tr-TR" : "en-US")
    .replace(/[ıİçğöşü]/g, (char) => FOLD_MAP[char] ?? char)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

const COLLATORS = new Map<string, Intl.Collator>();

/** Alphabetical order in the reader's alphabet (G-D2), not UTF-16 order. */
export function glossarySorted(locale: "en" | "tr"): GlossaryEntry[] {
  let collator = COLLATORS.get(locale);
  if (!collator) {
    collator = new Intl.Collator(locale === "tr" ? "tr-TR" : "en-US", { sensitivity: "base" });
    COLLATORS.set(locale, collator);
  }
  /* Sort on the folded term with leading punctuation removed: an entry called
     "New" means first seen belongs under N, not under the quote mark. */
  const key = (entry: GlossaryEntry) => fold(glossaryText(entry, locale).term, locale).replace(/^[^\p{L}\p{N}]+/u, "");
  return [...GLOSSARY].sort((a, b) => collator.compare(key(a), key(b)));
}

export type GlossaryMatchField = "term" | "alias" | "summary" | "body";

export interface GlossaryMatch {
  entry: GlossaryEntry;
  /** Where the query first hit, so the row can say why it matched. */
  in: GlossaryMatchField;
}

/**
 * Substring search over term, aliases, summary and body — every token must appear
 * somewhere in the entry (AND), and the reported field is the most specific one
 * that matched. An empty query returns every entry in collation order, so the
 * index page has one code path.
 */
export function searchGlossary(query: string, locale: "en" | "tr"): GlossaryMatch[] {
  const tokens = fold(query.trim(), locale).split(/\s+/).filter(Boolean);
  const matches: GlossaryMatch[] = [];

  for (const entry of glossarySorted(locale)) {
    const text = glossaryText(entry, locale);
    const fields: Array<[GlossaryMatchField, string]> = [
      ["term", text.term],
      ["alias", (entry.aliases?.[locale] ?? []).join(" ")],
      ["summary", text.summary],
      ["body", text.body.join(" ")]
    ];
    const folded = fields.map(([field, value]) => [field, fold(value, locale)] as const);
    const haystack = folded.map(([, value]) => value).join(" ");
    if (!tokens.every((token) => haystack.includes(token))) continue;
    const where =
      tokens.length === 0
        ? "term"
        : (folded.find(([field, value]) => (field === "body" ? false : tokens.some((token) => value.includes(token))))?.[0] ?? "body");
    matches.push({ entry, in: where });
  }

  /* A term hit outranks a body hit: typing "kuantizasyon" should open
     Quantization, not the first entry whose prose happens to mention it. */
  const rank: Record<GlossaryMatchField, number> = { term: 0, alias: 1, summary: 2, body: 3 };
  return tokens.length === 0 ? matches : matches.sort((a, b) => rank[a.in] - rank[b.in]);
}

const WORDS_PER_MINUTE = 200;

/** Reading cost of a term, summary included. Minimum one minute: nothing is "0 min". */
export function readingMinutes(entry: GlossaryEntry, locale: "en" | "tr"): number {
  const text = glossaryText(entry, locale);
  const words = `${text.summary} ${text.body.join(" ")}`
    .replace(/\{[a-z0-9-]+\}/g, "")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

export type BodySegment = { kind: "text"; text: string } | { kind: "ref"; slug: string };

/**
 * A body paragraph split into plain text and explicit `{slug}` cross-references.
 * An unknown slug stays literal text rather than rendering a broken link, and the
 * test suite asserts that no unknown slug exists in either language.
 */
export function bodySegments(paragraph: string): BodySegment[] {
  const segments: BodySegment[] = [];
  let cursor = 0;
  for (const match of paragraph.matchAll(/\{([a-z0-9-]+)\}/g)) {
    const index = match.index ?? 0;
    if (index > cursor) segments.push({ kind: "text", text: paragraph.slice(cursor, index) });
    const slug = match[1] ?? "";
    segments.push(getGlossaryEntry(slug) ? { kind: "ref", slug } : { kind: "text", text: match[0] });
    cursor = index + match[0].length;
  }
  if (cursor < paragraph.length) segments.push({ kind: "text", text: paragraph.slice(cursor) });
  return segments;
}

/** The slugs an entry cross-references in its own body, de-duplicated in order. */
export function refSlugs(entry: GlossaryEntry, locale: "en" | "tr"): string[] {
  const slugs = glossaryText(entry, locale)
    .body.flatMap((paragraph) => bodySegments(paragraph).flatMap((segment) => (segment.kind === "ref" ? [segment.slug] : [])));
  return [...new Set(slugs)];
}

/**
 * Previous/next in the same order the index prints, so a reader who entered from
 * the list can walk it. Returns `undefined` at either end instead of wrapping.
 */
export function glossaryNeighbours(
  slug: string,
  locale: "en" | "tr"
): { previous?: GlossaryEntry; next?: GlossaryEntry } {
  const ordered = glossarySorted(locale);
  const index = ordered.findIndex((entry) => entry.slug === slug);
  if (index < 0) return {};
  return { previous: ordered[index - 1], next: ordered[index + 1] };
}

/** Category buckets with their counts, in the order they are declared. */
export function glossaryCategoryCounts(): Array<{ category: GlossaryCategory; count: number }> {
  return (Object.keys(GLOSSARY_CATEGORIES) as GlossaryCategory[])
    .map((category) => ({ category, count: GLOSSARY.filter((entry) => entry.category === category).length }))
    .filter((group) => group.count > 0);
}
