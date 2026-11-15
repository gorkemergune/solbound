# Solbound — güncel durum (tek kaynak)

Son güncelleme: 14 Kasım 2026 · içerik sürümü `0.8.0-landing` (arayüz v0.9: ses) · kayıt şeması 7

Bu belge oyunun **şu anki** kapsamını özetler. Diğer belgelerle çelişirse bu belge ve kod geçerlidir. Eski belgeler `docs/archive/` klasöründedir: `00_START_HERE.md` ve v0.2 belgeleri tasarım geçmişidir; `PRODUCT.md`, `ARCHITECTURE.md`, `BACKLOG.md`, `CLAUDE_DISCOVERY_TASK.md` ise v0.1 önerisidir. Değişiklik günlüğü ve doğrulama sonuçları için [IMPLEMENTATION_NOTES.md](IMPLEMENTATION_NOTES.md), kullanıcının açık listesi için `bug/eksikler.md` (git’e girmez), son bağımsız test için [V4_TEST.md](archive/V4_TEST.md) okunmalıdır. [V4_PROMPT.md](archive/V4_PROMPT.md) bir önceki test görevidir; sıradaki test görevi (mentör formuna göre puanlama dahil) [V5_PROMPT.md](archive/V5_PROMPT.md).

## Ürün

NASA kayıtlarından beslenen, hikâye ağırlıklı bir **eğitim simülasyonu**. Resmî NASA ürünü değildir ve NASA logosu kullanılmaz. Dil EN/TR. Oyuncu kendi astronotunu ve üç ekip arkadaşını seçer, Ay ya da Mars’ta en fazla 30 günlük bir yüzey görevi yönetir, ekibi eve getirir ve sonunda paylaşılabilir bir özet filmi alır.

## Güncel değerler

| Konu | Şu an |
| --- | --- |
| Aday havuzu | 16 aday, 15 uzmanlık; tek ızgara, sağdaki ekip profili kaydırırken sabit kalır. Görev atama alanı 4 kişide 2 × 2, 6 kişide 3 × 2. |
| İsimler | Oyun diline göre (TR → Türk isimleri, EN → yaygın İngilizce isimler); cinsiyet portreyle eşleşir. |
| Yük | 520 kg fırlatma kütlesi: vücut kütlesi + kişi başı 20 kg kit + ek yük. |
| İniş yeri | Hedef (Ay/Mars) seçilir; iniş yeri kalkışta rastgele 8 yerden biri olur (kolay / orta / zor / çok zor). Yer adları gerçek, çarpanlar oyun varsayımı. |
| Görev süresi | En fazla 30 yüzey günü (son gün 14:00’te biter). “Eve dön” her zaman bir sonraki 13:00 kalkış penceresini planlar. |
| Hedef | Kalkıştan önce tahmin, olası iniş yerleri üzerinden aralık olarak gösterilir; inişte yere göre kesinleşir (olaysız ön simülasyon). Hedef bunun %85’idir ve başarı için gerekir. Tahmin kadar kalan ve herkesi getiren “Tahminin ötesinde” alır. |
| Dönüş | Ay: 3 gün, Mars: 6 gün (transfer aracına yükselme). Kişi başına yiyecek, O₂ ve su ile batarya gerekir. |
| Seçenekler | Her karar kartında kit, rol ya da araştırma gerektirmeyen en az 3 seçenek; kilitlilerle 4–6. |
| Zorluk | Başarı tabanı yazılı değerin %85’i; görevler 1,5 kat uzun, yorgunluk 1,4 kat. Dışarıdaki kişi-saat başına 0,06 kg O₂, 0,3 L su ve 0,25 kWh. |
| Hız | Varsayılan 2× (bir gün yaklaşık 30 sn); 1–16× arası seçilebilir. |

## Sistemler

- **Saf, deterministik motor** (`src/engine`). Aynı seed ve aynı NASA verisi aynı görevi verir.
- **Geri sayımlı büyük olaylar:** Mars toz fırtınası, Ay ekvator gecesi, meteor yağmuru, kutup karanlık dönemi, kargo modülü, gerçek CME varışları, takviye ekip (yalnız Ay). Tahminler saati **durdurmaz**: sahnenin üstünde bir bant ve günlük satırı olarak görünür. Hazırlık görevleri Plan sekmesindedir.
- **Tempo:** 2. gün kurulum önceliği, son günlerde son dış yürüyüş ve paketleme kararları; hasat kartları dönüşümlüdür.
- **Acil durumlar:** görev başına bir kez kullanılabilen ortak bir yedek vardır (O₂ tankları, su torbaları ya da tıbbi dengeleme). Aynı anda birkaç hasta olursa tek kart açılır; nedeni onarma seçeneği vardır ve hasta kendine atanamaz.
- **Stres:** 85 üstü sağlığı ve yorgunluğu bozar; 98’de ekip krizi kartı açılır. Fırtına bitince herkes sığınaktan çıkar.
- **Ekip:** ekip uyumu stres artışını azaltır. Arabulucu, soğukkanlı, botanikçi, kimyager, uzay havası analisti ve haberleşme subayının somut etkileri vardır (bkz. V3 düzeltmeleri).
- **Canlı NASA verisi (DONKI):** tarayıcıda **anahtar yoktur**. Kaynak sırası:
  1. önbellek (3 saatten yeni),
  2. sitenin `donki-latest.json` dosyası (script ya da GitHub Action ile anahtarla üretilir),
  3. NASA `DEMO_KEY` ile canlı istek (sınır IP başına),
  4. paketlenmiş örnek.

  Ekranda “kısmen güncel / alınamadı” ayrımı yapılır. Kartlarda gerçek kayıt, model tahmini ve oyun etkisi ayrı satırlarda yazılır.
- **Sinyal gecikmesi:** JPL yaklaşık gezegen konumu formülüyle yerelde hesaplanır; canlı Horizons çağrısı değildir. Testlerde Horizons’a karşı hata en fazla %0,02.
- **Özet filmi:** WebM video, PNG kart, Web Share ve kopyalanabilir metin.
- **Ses:** özgün müzik (4 döngü) ve efektler tarayıcıda Web Audio ile üretilir; ses dosyası yok. Üst çubukta 🔊 düğmesi: kapat/aç, müzik ve efekt sesi.
- **Yüzey üst satırı:** 📍 iniş yeri + zorluk + (i) gerçek NASA bilgisi ve kaynakları; 🎒 Envanter penceresi (stoklar, kalan eşyalar, hasat).
- **Rütbe:** görev sonunda bilim puanına göre 6 rütbe (0/100/200/350/500/700); ekipten kayıp varsa en fazla Araştırmacı.

## Çalıştırma

`npm install` · `npm run dev` · `npm test` · `npm run build` · `npm run e2e` (uzun) · `npm run e2e:short` (yaklaşık 30 sn) · `npm run donki:snapshot` (`.env` içinde `NASA_API_KEY`).

## Bilinen eksikler

1. “Başka bir karar verseydin?” karşılaştırması yok.
2. Video yalnız Chromium’da test edildi; Safari’de MP4 ve dosya paylaşımı denenmedi; GIF çıktısı yok.
3. Safari/Firefox, gerçek cihaz ve ekran okuyucu testleri yapılmadı.
4. Uygulama Vercel’de yayında: https://solbound.vercel.app. GitHub Action, depoda `NASA_API_KEY` sırrı tanımlanmadan çalışmaz; artık anahtar yoksa kırmızı biter. DONKI verisi 15 Kasım’da elle yenilendi. Tarayıcı, site kopyası 48 saatten yeniyse NASA’ya `DEMO_KEY` isteği atmaz.
5. Yapanlar penceresinde isimler var; roller ve portföy linki boş (`src/credits.ts`).
6. V5 testinin “sonra” listesinden açık kalanlar: ekip krizi neredeyse hiç açılmıyor (B10), EMG-MED görülen oyunlarda tam başarı %0,7 (B11), Windows’ta e2e `vite preview` sürecini öksüz bırakıyor (B9), özet WebM’inde süre bilgisi yok (B13). Ayrıntı [V5_TEST.md](archive/V5_TEST.md).
