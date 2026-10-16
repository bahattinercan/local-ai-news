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
    en: {
      term: "Quantization",
      summary: "Storing a model's weights at lower precision so it takes less space and memory.",
      body: [
        "A model is a large pile of numbers. By default those numbers are stored at high precision — BF16 uses two bytes per parameter, FP32 four. Quantization rewrites them into a coarser representation: fewer bits per number, so a smaller file and less memory to run it.",
        "The names encode the scheme and the bits. `Q8_0` is roughly one byte per parameter, `Q4_K_M` is roughly half a byte, `Q2_K` about a third. The suffix matters: `Q4_K_M` and `Q4_K_S` target the same size but spend their error budget differently, and the `_K` variants quantize in blocks so important tensors keep more precision.",
        "The trade is quality for size, and it is not linear. Going from BF16 to 8 bits is usually hard to notice; going below 4 bits starts to cost reasoning, instruction-following and long-context coherence, and the damage differs by model family. There is no universally safe choice, which is why a repository often ships several quantizations of the same weights.",
        "Rough bytes per parameter, as used by this site's estimator: BF16 2.0, FP8 1.0, Q8_0 1.0, Q6_K 0.75, Q5_K_M 0.66, Q4_K_M 0.5625, Q3_K_M 0.44, Q2_K 0.375."
      ]
    },
    tr: {
      term: "Kuantizasyon",
      summary: "Model ağırlıklarını daha düşük hassasiyette saklayıp daha az yer ve bellek kullanmak.",
      body: [
        "Model, çok sayıda sayıdan oluşan bir yığındır. Bu sayılar varsayılan olarak yüksek hassasiyette saklanır — BF16 parametre başına iki bayt, FP32 dört bayt. Kuantizasyon sayıları daha kaba bir gösterime çevirir: sayı başına daha az bit, yani daha küçük dosya ve çalıştırmak için daha az bellek.",
        "İsimler şemayı ve bit sayısını kodlar. `Q8_0` kabaca parametre başına bir bayt, `Q4_K_M` yarım bayt, `Q2_K` üçte bir. Sonek önemlidir: `Q4_K_M` ve `Q4_K_S` aynı boyutu hedefler ama hata bütçesini farklı harcar; `_K` varyantları bloklar hâlinde kuantize eder, böylece önemli tensörler daha fazla hassasiyet korur.",
        "Takas kalite karşılığı boyuttur ve doğrusal değildir. BF16'dan 8 bit'e inmek genelde fark edilmez; 4 bitin altı akıl yürütme, talimat takibi ve uzun bağlam tutarlılığını bozmaya başlar ve hasar model ailesine göre değişir. Evrensel güvenli bir seçim yoktur; bu yüzden bir repo sıklıkla aynı ağırlıkların birkaç kuantizasyonunu yayınlar.",
        "Bu sitenin tahminleyicisinin kullandığı yaklaşık bayt/parametre değerleri: BF16 2.0, FP8 1.0, Q8_0 1.0, Q6_K 0.75, Q5_K_M 0.66, Q4_K_M 0.5625, Q3_K_M 0.44, Q2_K 0.375."
      ]
    }
  },
  {
    slug: "vram",
    category: "hardware",
    related: ["quantization", "context-window", "gguf"],
    en: {
      term: "VRAM",
      summary: "GPU memory a model needs to run — weights plus the KV cache, not just the file size.",
      body: [
        "The file size is the floor, not the answer. To serve a model the runtime has to hold the weights plus a per-token cache of attention state (the KV cache), plus a working overhead. That is why an 8 GB model can still need more than 8 GB of video memory.",
        "Weights scale with the parameter count and the quantization, KV cache scales with the parameter count and the context length. This site's estimator is `params x bytes_per_param + kv`, where the KV term is anchored at roughly 1 GB per 7B parameters at a 4096-token context and grows linearly with the context.",
        "Worked examples from the model pages: a 12B model at Q4_K_M over a 4096-token context estimates at about 8.6 GB; the same model at a 32768-token context estimates at about 21.2 GB, because the KV cache grew eightfold while the weights did not; a 70B at Q4_K_M estimates at about 49.9 GB.",
        "Treat all of it as an estimate. The KV size depends on the number of layers, the number of KV heads and the dtype the runtime chooses, none of which are visible in the repository metadata, and offloading some layers to system RAM changes the picture entirely."
      ]
    },
    tr: {
      term: "VRAM",
      summary: "Modelin çalışması için gereken ekran kartı belleği — sadece dosya boyutu değil, ağırlıklar artı KV önbelleği.",
      body: [
        "Dosya boyutu taban çizgidir, cevap değil. Çalıştırmak için ağırlıklar artı token başına attention durumu önbelleği (KV önbelleği) artı çalışma payı gerekir. 8 GB'lık bir modelin neden 8 GB'dan fazla ekran kartı belleği isteyebildiğinin sebebi budur.",
        "Ağırlıklar parametre sayısı ve kuantizasyonla ölçeklenir; KV önbelleği parametre sayısı ve bağlam uzunluğuyla. Bu sitenin tahmini `parametre x bayt/parametre + kv`; KV terimi 4096 token bağlamda 7B parametre başına yaklaşık 1 GB olarak kalibre edildi ve bağlamla doğrusal büyür.",
        "Model sayfalarından örnekler: 12B bir model Q4_K_M ile 4096 token bağlamda yaklaşık 8.6 GB; aynı model 32768 token bağlamda yaklaşık 21.2 GB, çünkü KV önbelleği sekiz kat büyürken ağırlıklar sabit kaldı; 70B Q4_K_M yaklaşık 49.9 GB.",
        "Hepsini tahmin olarak gör. KV boyutu katman sayısına, KV head sayısına ve çalışma zamanının seçtiği dtype'a bağlıdır; bunların hiçbiri repo metadatasında görünmez, ayrıca katmanların bir kısmını sistem RAM'ine taşımak tabloyu tamamen değiştirir."
      ]
    }
  },
  {
    slug: "context-window",
    category: "hardware",
    related: ["vram", "quantization"],
    en: {
      term: "Context window",
      summary: "How many tokens the model can attend to at once, and the main driver of memory growth.",
      body: [
        "The context window is the maximum number of tokens (roughly, word pieces) the model can consider in a single pass: the prompt, the conversation so far and the answer it is producing. Older models topped out at a few thousand tokens; current ones advertise 128k or more.",
        "A larger window is not free. Attention state is cached for every token in the window, so memory grows linearly with it while the weights stay fixed. That is why the same model can run comfortably in one setup and not another purely because of the context setting.",
        "It is also not automatically useful. Quality over long contexts often degrades well before the advertised limit — information in the middle of a very long prompt is measurably harder for many models to use than information at the start or the end.",
        "Practically: if a model does not fit, try a smaller context before reaching for a more aggressive quantization. It costs nothing in weight precision and often saves more memory than dropping a quantization step."
      ]
    },
    tr: {
      term: "Bağlam penceresi",
      summary: "Modelin tek seferde dikkate alabileceği token sayısı ve bellek büyümesinin ana sebebi.",
      body: [
        "Bağlam penceresi modelin tek geçişte değerlendirebileceği en fazla token sayısıdır (kabaca kelime parçaları): istem, o ana kadarki konuşma ve üretmekte olduğu yanıt. Eski modeller birkaç bin tokenla sınırlıydı; yenileri 128k ve üzerini duyuruyor.",
        "Büyük pencere bedava değil. Penceredeki her token için attention durumu önbelleğe alınır, yani bellek doğrusal büyürken ağırlıklar sabit kalır. Aynı modelin bir kurulumda rahat, diğerinde sığmamasının sebebi sadece bağlam ayarıdır.",
        "Ayrıca otomatik olarak faydalı da değildir. Uzun bağlamlarda kalite, duyurulan sınıra varmadan bozulur; çok uzun bir istemin ortasındaki bilgiyi kullanmak, başındaki veya sonundaki bilgiye göre ölçülebilir biçimde daha zordur.",
        "Pratikte: model sığmıyorsa daha agresif kuantizasyona geçmeden önce bağlamı küçültmeyi dene. Ağırlık hassasiyetine hiçbir maliyeti yoktur ve çoğu zaman bir kuantizasyon kademesi düşürmekten daha fazla bellek kazandırır."
      ]
    }
  },
  {
    slug: "gguf",
    category: "formats",
    related: ["quantization", "params", "safetensors"],
    en: {
      term: "GGUF",
      summary: "llama.cpp's single-file format, and why these repositories rarely have a parameter count.",
      body: [
        "GGUF is the file format llama.cpp reads. It packs the weights, the tokenizer and the metadata into one file, and it is the usual way a quantized model is distributed for local use. A single repository often ships the same model at half a dozen quantizations, each as its own `.gguf`.",
        "That packaging is why this site can list exact file sizes for GGUF models: the repository's file listing carries a name and a byte count per quantization, so you can see that `Q8_0` is 5.99 GB and `Q6_K` is 4.67 GB and decide what fits.",
        "It is also why the parameter count is usually missing. That number normally comes from the model's `safetensors` metadata, which GGUF files do not have. Measured across this site's snapshot: 46 GGUF repositories, none with a parameter count, while 70% of them do report which quantizations exist.",
        "So for GGUF models the useful answer is not \"how many parameters\" but \"which file fits\". The model pages show the file table for exactly this reason, and the VRAM calculator accepts a typed-in parameter count when none is stored."
      ]
    },
    tr: {
      term: "GGUF",
      summary: "llama.cpp'nin tek dosyalı formatı ve bu repolarda parametre sayısının neden çoğu zaman olmadığı.",
      body: [
        "GGUF, llama.cpp'nin okuduğu dosya formatıdır. Ağırlıkları, tokenizer'ı ve metadatayı tek dosyada toplar ve kuantize bir modelin yerel kullanım için dağıtılmasının olağan yoludur. Bir repo sıklıkla aynı modeli yarım düzine kuantizasyonda, her biri kendi `.gguf` dosyası olarak yayınlar.",
        "Bu paketleme, sitemizin GGUF modelleri için tam dosya boyutlarını listeleyebilmesinin sebebidir: repo dosya listesi her kuantizasyon için ad ve bayt sayısı taşır; böylece `Q8_0`'ın 5.99 GB, `Q6_K`'nın 4.67 GB olduğunu görüp neyin sığacağına karar verebilirsin.",
        "Parametre sayısının genelde eksik olmasının sebebi de budur. O sayı normalde modelin `safetensors` metadatasından gelir; GGUF dosyalarında bu yok. Bu sitenin snapshot'ında ölçüldü: 46 GGUF reposu, hiçbirinde parametre sayısı yok, ama %70'i hangi kuantizasyonların bulunduğunu bildiriyor.",
        "Yani GGUF modellerinde faydalı cevap \"kaç parametre\" değil, \"hangi dosya sığıyor\". Model sayfaları tam bu yüzden dosya tablosunu gösteriyor ve VRAM hesaplayıcı, kayıtlı sayı yoksa elle girilen değeri kabul ediyor."
      ]
    }
  },
  {
    slug: "safetensors",
    category: "formats",
    related: ["gguf", "quantization", "params"],
    en: {
      term: "Safetensors",
      summary: "The Hugging Face default weight format, and where a reliable parameter count comes from.",
      body: [
        "Safetensors is a simple container for tensors designed to be safe to load and fast to memory-map. It is the default distribution format on Hugging Face for PyTorch, diffusers and most fine-tunes, usually as one or a few `.safetensors` files plus a config.",
        "Because it is a structured container, the hosting platform can read the tensor shapes without downloading the weights. That is where the parameter count, and the per-dtype breakdown, comes from — the metadata lists how many parameters exist at BF16, FP8, INT8 and so on.",
        "That distinction decides what this site can show. A model stored as safetensors has a real parameter count, so the VRAM calculator can prefill it; a model shipped only as GGUF does not, so it has to be entered by hand.",
        "It also means the count is exact rather than inferred — and it is why this site refuses to guess the count from a repository's total size, which was measured to be wrong by up to 108x because that total includes every file, not just the weights."
      ]
    },
    tr: {
      term: "Safetensors",
      summary: "Hugging Face'in varsayılan ağırlık formatı ve güvenilir parametre sayısının kaynağı.",
      body: [
        "Safetensors, tensörler için yüklenmesi güvenli ve belleğe hızlı eşlenebilir olacak şekilde tasarlanmış basit bir kapsayıcıdır. Hugging Face'te PyTorch, diffusers ve çoğu fine-tune için varsayılan dağıtım formatıdır; genelde bir veya birkaç `.safetensors` dosyası artı bir config.",
        "Yapılandırılmış bir kapsayıcı olduğu için barındırma platformu tensör şekillerini ağırlıkları indirmeden okuyabilir. Parametre sayısı ve dtype kırılımı buradan gelir — metadata kaç parametrenin BF16, FP8, INT8 vb. olduğunu listeler.",
        "Bu ayrım sitemizin neyi gösterebileceğini belirler. Safetensors olarak saklanan bir modelin gerçek parametre sayısı vardır, yani VRAM hesaplayıcı onu önceden doldurabilir; yalnızca GGUF olarak yayınlanan modelde yoktur, elle girilmesi gerekir.",
        "Ayrıca sayının çıkarım değil kesin olduğu anlamına gelir — ve sitemizin sayıyı repo toplam boyutundan tahmin etmeyi reddetmesinin sebebi budur; o toplam sadece ağırlıkları değil her dosyayı içerdiği için ölçümde 108 kata kadar yanlış çıktı."
      ]
    }
  },
  {
    slug: "params",
    category: "concepts",
    related: ["quantization", "vram", "gguf", "safetensors"],
    en: {
      term: "Parameters (B)",
      summary: "The number of learned weights, written in billions — and what it does and does not tell you.",
      body: [
        "A parameter is one learned number in the model. Counts are quoted in billions, so \"7B\" means roughly seven billion of them. It is the single most useful size signal because VRAM scales directly with it, at a given quantization.",
        "It says much less about capability than the marketing implies. Architecture, training data, training compute and post-training all matter, and a well-trained 9B can beat a hastily trained 30B on real tasks. Parameter count is a size label, not a quality label.",
        "Two conventions are worth knowing. A mixture-of-experts model quotes both numbers (`35B3A` means 35B total, 3B active per token), and the active figure is closer to what you pay for compute while the total is closer to what you pay for memory.",
        "This site only shows a parameter count it can source from model metadata, and is explicit when there is none. It is never written from the file size: measured against 51 models that had both, size-derived counts landed within 30% for only 23 of them."
      ]
    },
    tr: {
      term: "Parametre (B)",
      summary: "Öğrenilmiş ağırlık sayısı, milyar cinsinden — neyi söyler, neyi söylemez.",
      body: [
        "Parametre modeldeki öğrenilmiş bir sayıdır. Sayılar milyar cinsinden verilir; yani \"7B\" kabaca yedi milyar demektir. Verili bir kuantizasyonda VRAM doğrudan bununla ölçeklendiği için en faydalı boyut sinyalidir.",
        "Yetenek hakkında ise pazarlamanın ima ettiğinden çok daha az şey söyler. Mimari, eğitim verisi, eğitim hesabı ve eğitim sonrası süreçlerin hepsi önemlidir; iyi eğitilmiş bir 9B, acele eğitilmiş bir 30B'yi gerçek görevlerde geçebilir. Parametre sayısı bir boyut etiketi, kalite etiketi değildir.",
        "İki gösterimi bilmek işe yarar. Mixture-of-experts bir model iki sayı verir (`35B3A` = toplam 35B, token başına 3B aktif); aktif sayı hesap maliyetine, toplam sayı bellek maliyetine daha yakındır.",
        "Bu site yalnızca model metadatasından kaynaklandırabildiği parametre sayısını gösterir ve yoksa bunu açıkça belirtir. Sayı asla dosya boyutundan yazılmaz: her ikisi de bulunan 51 modelde ölçüldüğünde, boyuttan türetilen sayılar yalnızca 23'ünde ±%30 içinde kaldı."
      ]
    }
  },
  {
    slug: "moe",
    category: "architecture",
    related: ["params", "vram"],
    en: {
      term: "Mixture of experts (MoE)",
      summary: "A model with many expert blocks that activates only a few per token.",
      body: [
        "In a dense model every parameter participates in every token, so compute and memory both scale with the parameter count. A mixture-of-experts model replaces the large feed-forward blocks with many smaller \"experts\" plus a router that sends each token to only a few of them.",
        "The consequence is that the total parameter count and the per-token compute decouple: a model can hold 35B parameters while computing with roughly 3B of them per token. That is why you see shorthand like `35B3A` — 35B total, about 3B active.",
        "Memory is the catch. Every expert has to be resident even though most are idle for any given token, so a MoE model wants memory sized by the total and compute sized by the active count. It is a good fit when memory is plentiful and tokens per second matter, and a poor fit on a small card.",
        "It also affects quantization choices: the expert blocks are a large share of the total, so quantizing them aggressively buys more memory than the same change on a dense model, at a quality cost that is debated and architecture-specific."
      ]
    },
    tr: {
      term: "Uzman karışımı (MoE)",
      summary: "Her token için yalnızca birkaç uzman bloğu etkinleştiren, çok sayıda uzman içeren model.",
      body: [
        "Yoğun (dense) bir modelde her parametre her tokenda yer alır, yani hesap da bellek de parametre sayısıyla ölçeklenir. Uzman karışımı bir model büyük ileri-besleme bloklarını çok sayıda küçük \"uzman\" ve her tokenı yalnızca birkaçına gönderen bir yönlendiriciyle değiştirir.",
        "Sonuç, toplam parametre sayısıyla token başına hesabın ayrışmasıdır: bir model 35B parametre taşırken token başına kabaca 3B ile hesap yapabilir. `35B3A` gibi kısaltmaları görmenin sebebi budur — toplam 35B, aktif yaklaşık 3B.",
        "İşin zor kısmı bellektir. Çoğu tokenda boş otursalar da bütün uzmanlar bellekte durmak zorundadır; yani MoE modeli bellek olarak toplam sayıya, hesap olarak aktif sayıya göre boyutlanır. Bellek bolsa ve saniyedeki token önemliyse iyi uyar, küçük bir kartta kötü.",
        "Kuantizasyon seçimini de etkiler: uzman blokları toplamın büyük bir kısmıdır, dolayısıyla onları agresif kuantize etmek yoğun bir modeldeki aynı değişiklikten daha fazla bellek kazandırır; kalite maliyeti tartışmalıdır ve mimariye göre değişir."
      ]
    }
  },
  {
    slug: "lora",
    category: "architecture",
    related: ["params", "safetensors", "quantization"],
    en: {
      term: "LoRA and adapters",
      summary: "Small add-on weight sets that modify a base model without retraining it.",
      body: [
        "Low-rank adaptation trains a small pair of matrices instead of the whole model, then adds their effect to the frozen original weights. The result is an adapter measured in tens or hundreds of megabytes rather than tens of gigabytes, which is why fine-tunes are cheap to produce and share.",
        "An adapter does not stand alone: it needs its base model. A repository page showing a small file next to a large one is usually exactly that pair, and the base model is frequently named in the model card — this site surfaces it as the \"base model\" specification.",
        "Adapters are also why a repository's total size is a bad proxy for the model size. A repo can hold several quantizations, several adapters and training leftovers; the total is the sum of everything, not the weights you would load.",
        "This was measured, not assumed: dividing a repository's total size by bytes-per-parameter matched the real parameter count within 30% for only 23 of 51 models, the worst case being 108x — which is why this site shows a file table and a sourced parameter count instead of a size-derived one."
      ]
    },
    tr: {
      term: "LoRA ve adaptörler",
      summary: "Temel modeli yeniden eğitmeden değiştiren küçük ek ağırlık setleri.",
      body: [
        "Low-rank adaptation, tüm model yerine küçük bir matris çifti eğitir ve etkilerini donmuş orijinal ağırlıklara ekler. Sonuç, onlarca gigabayt yerine onlarca yüz megabaytla ölçülen bir adaptördür; fine-tune'ların üretimi ve paylaşımı bu yüzden ucuzdur.",
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
    en: {
      term: "Quality gate",
      summary: "This site's noise filter: what has to be true before a model appears in the feed by default.",
      body: [
        "Hugging Face receives a very large number of uploads, most of which are tests, half-finished fine-tunes or empty repositories. Without a filter the feed would be unusable.",
        "A model passes the gate if at least one of these holds: it has at least 5 likes, at least 50 downloads, comes from a curated organisation, or ships a widget (an interactive preview with sample outputs). Gated repositories that require accepting terms are excluded separately.",
        "The gate is a filter, not a verdict. \"Passed\" means \"not obviously noise yet\", and a model that has just been uploaded needs time to accumulate likes and downloads, so new models legitimately start on the other side of it. That is what the \"show everything\" toggle is for — it is deliberately restricted to a 30-day window with a category selected, because otherwise the result set explodes.",
        "The gate also decides what counts as a release announcement: a model that passes it and is either trending, well liked or from a curated organisation is worth a news row."
      ]
    },
    tr: {
      term: "Kalite kapısı",
      summary: "Bu sitenin gürültü filtresi: bir modelin varsayılan akışta görünmesi için neyin doğru olması gerektiği.",
      body: [
        "Hugging Face'e çok sayıda yükleme geliyor; çoğu test, yarım kalmış fine-tune veya boş repo. Filtre olmadan akış kullanılamaz hâle gelir.",
        "Bir model şu koşullardan en az biri sağlanırsa kapıyı geçer: en az 5 beğeni, en az 50 indirme, küratörlü bir organizasyondan gelmek veya bir widget (örnek çıktıları olan etkileşimli önizleme) taşımak. Şart kabulü gerektiren gated repolar ayrıca dışlanır.",
        "\"Geçti\" bir hüküm değil, filtredir: \"henüz bariz gürültü değil\" demektir. Yeni yüklenen bir modelin beğeni ve indirme biriktirmesi zaman alır, yani yeni modeller meşru olarak kapının diğer tarafından başlar. \"Her şeyi göster\" anahtarı bunun içindir — bilinçli olarak 30 günlük pencere ve seçili kategoriyle sınırlıdır, çünkü aksi hâlde sonuç kümesi patlar.",
        "Kapı aynı zamanda neyin sürüm duyurusu sayılacağını belirler: kapıyı geçen ve trend olan, çok beğenilen veya küratörlü bir organizasyondan gelen model bir haber satırı hak eder."
      ]
    }
  },
  {
    slug: "runner",
    category: "hardware",
    related: ["quantization", "gguf", "vram"],
    en: {
      term: "Runner",
      summary: "The program that actually loads the weights and generates text or images on your machine.",
      body: [
        "A model is a file; a runner is the program that reads it. Hugging Face tells this site which one a repository is built for — the `library` field and the tags on the repo — which is why a card can say `transformers · llama.cpp`.",
        "They are not interchangeable, and the choice decides the file you need. `llama.cpp` and `Ollama` load GGUF files and run well on a CPU with optional GPU offload; `vLLM` and `ExLlama` target GPUs and throughput for serving; `MLX` is Apple silicon; `transformers` runs the original safetensors weights through PyTorch; `ComfyUI` is the image/video workflow tool that loads diffusers checkpoints.",
        "So a runner is not a quality ranking. A repository that offers GGUF is not better than one that only ships safetensors — it is usable by a different set of programs. The filter on this site narrows the feed to repositories you can run with the tool you already have.",
        "The run command shown on a model page is generated from this field, which is why it uses the flags of the listed runner rather than a generic example."
      ]
    },
    tr: {
      term: "Runner (çalıştırıcı)",
      summary: "Ağırlıkları yükleyip makinenizde metin veya görsel üreten program.",
      body: [
        "Model bir dosyadır; runner onu okuyan programdır. Hugging Face bu siteye bir deponun hangi program için hazırlandığını bildirir — depodaki `library` alanı ve etiketler — bu yüzden bir kart `transformers · llama.cpp` yazabilir.",
        "Birbirlerinin yerine geçmezler ve seçim, ihtiyacınız olan dosyayı belirler. `llama.cpp` ve `Ollama` GGUF dosyalarını yükler, CPU'da iyi çalışır ve isteğe bağlı GPU'ya devredebilir; `vLLM` ve `ExLlama` GPU'ya ve sunum verimine yönelir; `MLX` Apple silicon içindir; `transformers` orijinal safetensors ağırlıklarını PyTorch ile çalıştırır; `ComfyUI` diffusers checkpoint'lerini yükleyen görsel/video iş akışı aracıdır.",
        "Yani runner bir kalite sıralaması değildir. GGUF sunan bir depo, yalnızca safetensors yayınlayandan daha iyi değildir — farklı programlar tarafından kullanılabilir. Bu sitedeki filtre, akışı elinizdeki araçla çalıştırabileceğiniz depolara daraltır.",
        "Model sayfasında gösterilen çalıştırma komutu bu alandan üretilir; bu yüzden genel bir örnek yerine listelenen runner'ın kendi bayraklarını kullanır."
      ]
    }
  },
  {
    slug: "first-seen",
    category: "concepts",
    related: ["quality-gate"],
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
