# Solbound — güncel durum (tek kaynak)

Son güncelleme: 14 Kasım 2026 · içerik sürümü `0.7.0-goal` · kayıt şeması 6

Bu belge oyunun **şu anki** kapsamını özetler. Diğer belgelerle çelişirse bu belge ve kod geçerlidir. `00_START_HERE.md` ve v0.2 belgeleri tasarım geçmişidir; `PRODUCT.md`, `ARCHITECTURE.md`, `BACKLOG.md`, `CLAUDE_DISCOVERY_TASK.md` ise v0.1 önerisidir. Değişiklik günlüğü ve doğrulama sonuçları için [IMPLEMENTATION_NOTES.md](IMPLEMENTATION_NOTES.md), kullanıcının açık listesi için kökteki `eksikler.md`, son bağımsız test için [V3_TEST.md](V3_TEST.md), bir sonraki test görevi için [V4_PROMPT.md](V4_PROMPT.md) okunmalıdır.

## Ürün

NASA kayıtlarından beslenen, hikâye ağırlıklı bir **eğitim simülasyonu**. Resmî NASA ürünü değildir ve NASA logosu kullanılmaz. Dil EN/TR. Oyuncu kendi astronotunu ve üç ekip arkadaşını seçer, Ay ya da Mars’ta en fazla 30 günlük bir yüzey görevi yönetir, ekibi eve getirir ve sonunda paylaşılabilir bir özet filmi alır.

## Güncel değerler

| Konu | Şu an |
| --- | --- |
| Aday havuzu | 16 aday, 15 uzmanlık. Ekranda sayfalı gösterilir (geniş ekranda 3 × 2, dar ekranda 2 × 2). |
| İsimler | Oyun diline göre (TR → Türk isimleri, EN → yaygın İngilizce isimler); cinsiyet portreyle eşleşir. |
| Yük | 520 kg fırlatma kütlesi: vücut kütlesi + kişi başı 20 kg kit + ek yük. |
| Görev süresi | En fazla 30 yüzey günü (son gün 14:00’te biter). “Eve dön” düğmesiyle istenen an dönülebilir. |
| Hedef | Kalkıştan önce ekip ve yükle **tahmini kalış süresi** hesaplanır (olaysız ön simülasyon). Hedef bunun %85’idir. Hedefe ulaşmak tam başarı için gerekir. |
| Dönüş | Ay: 3 gün, Mars: 6 gün (transfer aracına yükselme). Kişi başına yiyecek, O₂ ve su ile batarya gerekir. |
| Seçenekler | Her karar kartında kit, rol ya da araştırma gerektirmeyen en az 3 seçenek; kilitlilerle 4–6. |
| Zorluk | Başarı tabanı yazılı değerin %85’i; görevler 1,5 kat uzun, yorgunluk 1,4 kat. Dışarıdaki kişi-saat başına 0,06 kg O₂, 0,3 L su ve 0,25 kWh. |
| Hız | Varsayılan 2× (bir gün yaklaşık 30 sn); 1–16× arası seçilebilir. |

## Sistemler

- **Saf, deterministik motor** (`src/engine`). Aynı seed ve aynı NASA verisi aynı görevi verir.
- **Geri sayımlı büyük olaylar:** Mars toz fırtınası, Ay ekvator gecesi, meteor yağmuru, kutup karanlık dönemi, kargo modülü, gerçek CME varışları, takviye ekip (yalnız Ay). Tahminler saati **durdurmaz**: sahnenin üstünde bir bant ve günlük satırı olarak görünür. Hazırlık görevleri Plan sekmesindedir.
- **Tempo:** 2. gün kurulum önceliği, son günlerde son dış yürüyüş ve paketleme kararları; hasat kartları dönüşümlüdür.
- **Acil durumlar:** görev başına bir kez kullanılabilen ortak bir yedek vardır (O₂ tankları, su torbaları ya da tıbbi dengeleme). Aynı anda birkaç hasta olursa tek kart açılır.
- **Ekip:** ekip uyumu stres artışını azaltır. Arabulucu, soğukkanlı, botanikçi, kimyager, uzay havası analisti ve haberleşme subayının somut etkileri vardır (bkz. V3 düzeltmeleri).
- **Canlı NASA verisi (DONKI):** tarayıcıda **anahtar yoktur**. Kaynak sırası:
  1. önbellek (3 saatten yeni),
  2. sitenin `donki-latest.json` dosyası (script ya da GitHub Action ile anahtarla üretilir),
  3. NASA `DEMO_KEY` ile canlı istek (sınır IP başına),
  4. paketlenmiş örnek.

  Ekranda “kısmen güncel / alınamadı” ayrımı yapılır. Kartlarda gerçek kayıt, model tahmini ve oyun etkisi ayrı satırlarda yazılır.
- **Sinyal gecikmesi:** JPL yaklaşık gezegen konumu formülüyle yerelde hesaplanır; canlı Horizons çağrısı değildir. Testlerde Horizons’a karşı hata en fazla %0,02.
- **Özet filmi:** WebM video, PNG kart, Web Share ve kopyalanabilir metin.

## Çalıştırma

`npm install` · `npm run dev` · `npm test` · `npm run build` · `npm run e2e` · `npm run donki:snapshot` (`.env` içinde `NASA_API_KEY`).

## Bilinen eksikler

1. “Başka bir karar verseydin?” karşılaştırması yok.
2. Video yalnız Chromium’da test edildi; Safari’de MP4 ve dosya paylaşımı denenmedi; GIF çıktısı yok.
3. Safari/Firefox, gerçek cihaz ve ekran okuyucu testleri yapılmadı.
4. GitHub Action, depo sırrı tanımlanıp gönderilmeden çalışmaz; yayın (deploy) kurulmadı.
