# V4 test görevi (Claude için hazır prompt)

Aşağıdaki metni olduğu gibi yeni bir Claude Code oturumuna verin. Oturum depoyu yalnız okumalı ve sonuçları iki dosyaya yazmalıdır.

---

Solbound deposunda (`CLAUDE.md` ve `docs/CURRENT_STATE.md` dosyalarını önce oku) **v0.7 (`0.7.0-goal`)** sürümünü ayrıntılı test et. Önceki bağımsız test `docs/V3_TEST.md` ve `docs/summary_v3.json` dosyalarında; aynı yöntemi kullan ve sonuçları **V3 ile yan yana** karşılaştır.

## Kurallar

- Kaynak koda, testlere ve belgelere dokunma. Yalnız iki çıktı dosyası yaz: `docs/V4_TEST.md` (Türkçe rapor) ve `docs/summary_v4.json` (tablolar).
- Simülasyonu gerçek motor üzerinden çalıştır: `applyCommand` komut kapısı, gerçek kütle bütçesi (`setCargo` ile), normal `launch` komutu, seed’den üretilen profiller. Kısa yol olarak `src/engine/testkit.ts` içindeki `realistic()` ve `playLaunched()` kullanılabilir; `prepared()` ve `launchAnyway()` kütle kontrolünü atladığı için ana taramada kullanma.
- Bellek: V3 taraması 40.468 oyunda bellek yüzünden durdu. Bu kez işi **5.000 oyunluk parçalara** böl. Her parçanın özetini diske yaz, ham oyun durumlarını bellekte tutma ve parçaları sonda birleştir. Hedef en az 40.000 oyun; zaman ya da bellek yetmezse kaç oyunla durduğunu açıkça yaz.
- Botların ne yapamadığını (araştırma okuma, rutin değiştirme, güç önceliği vb.) rapordaki “Sınırlar” bölümünde belirt. Eşya ve uzmanlık etkileri korelasyondur; bunu da belirt.
- Uydurma sayı yazma; her sayı senin koşturduğun oyunlardan gelsin.

## Örnekleme (V3 ile aynı eksenler)

- Hedef: Ay kutup, Ay ekvator, Mars bahar, Mars yaz (eşit).
- Ekip: 16 adaydan rastgele 3 kişi.
- Kargo: boş / az / rastgele / dolu (kütle bütçesine uyarak).
- Mod: normal / keşif.
- Canlı uzay havası: `src/live/donki-fallback.json` anlık görüntüsüyle ya da onsuz (`setSpaceWeather` komutu).
- Oyuncu tipleri:
  - **Özenli:** hazırlık görevlerini yapar, acil durum yedeğini kullanır, hedefe ulaşınca döner.
  - **Karışık.**
  - **Rastgele.**
  - **Pervasız.**
  - **Erken dönen:** hedeften önce “Eve dön” der. Bu, v0.7’de yeni.
- Takviye ekip teklifi (yalnız Ay; iniş en erken 20. gün): kabul / kargo / ret dağılımını da örnekle.

## Doğrulanacak V3 bulguları

Her biri için “düzeldi / kısmen / devam ediyor” ve sayısal kanıt ver.

1. **Mars baharı tuzağı:** fırtınadan sonra sera önceki moduna dönüyor mu? Görev artık son gün 14:00’te bitiyor; bahar başarı oranı ne oldu?
2. **Gıda paketi baskınlığı:** paket artık +10 kişi-gün. MOXIE 24 kg ve elektroliz suyunu azaltıyor; kalkan 32 kg; batarya +30 kWh. Eşya lift tablolarını V3 ile karşılaştır.
3. **Acil durumlar kurtarıyor mu?** Görev başına bir kez kullanılan yedek (O₂ +8 kg, su +40 L ya da tıbbi dengeleme) kullanıldığında sonuç dağılımı ne?
4. **Dönüş:** “bir gün bekle” artık serayı kapatıp şarj ediyor; RETURN-02 “yedek hat” artık şansa bağlı. Seçeneklerin başarı payları nasıl dağılıyor?
5. **Tempo:**
   - Kararsız gün oranı.
   - 2. gün olay sayısı ve 26–30. günler arası olay sayısı (yeni olaylar: SETUP, FINAL-EVA, PACK).
   - Tahminler artık saati durdurmuyor; oyun başına duraklama sayısı.
6. **Ekip uyumu ve uzmanlıklar:** teamwork artık stres artışını ve çok kişili görev şansını etkiliyor. Haberleşme, kimyager, uzay havası, botanikçi, arabulucu ve soğukkanlı uzmanlıklarının lift değerleri V3’e göre nasıl değişti?
7. **API anahtarı:**
   - `npm run build` sonrası `dist/` içinde NASA anahtarı ya da `api_key=` geçen gerçek bir anahtar var mı? Yalnız `DEMO_KEY` olmalı. Anahtarın kendisini rapora **yazma**; yalnız var / yok söyle.
   - `vite.config.ts` içinde `NASA_` önekinin kalmadığını doğrula.

## Yeni v0.7 özellikleri

- **Tahmini kalış ve hedef** (`estimateStay`):
  - Farklı ekip ve yüklerde tahminin dağılımı ve darboğaz kaynağı.
  - Hedefe (%85) ulaşan oyunların oranı.
  - Tahmin gerçek oyunla ne kadar örtüşüyor? Olaylar yüzünden tahminden önce tükenen oyunların payı.
- **Eve dön:** erken dönüşte sonuç dağılımı. “Hedefe ulaşınca hemen dön” stratejisi baskın mı? (Yani oyuncunun 30 güne kalması için bir neden var mı?)
- **Takviye ekip (Ay):** kabul / kargo / ret seçeneklerinin başarı ve kayıp payları.
- **Seçenek zenginliği:**
  - Her olayda “kaderi değiştiren” seçenekler hangileri?
  - Hâlâ açıkça baskın ya da hiç seçilmemesi gereken seçenek var mı? (Karar öncesi ve sonrası başarı farkıyla göster.)
- **Hasat çeşitleri** (HARVEST, HARVEST-MOLD, HARVEST-FEAST, HARVEST-SEEDS): dağılım ve sonuca etkileri.
- **Zorluk:** özenli oyuncu için hedef aralık yaklaşık %60–75 tam başarı. Rastgele oyuncu için kayıp payı V3’teki %10,5 ile karşılaştır.

## Arayüz denetimi

Tarayıcı aracı varsa `npm run build && npm run e2e` çalıştır ve sonucu yaz. `e2e-screens/` altındaki ekran görüntülerinden şunları kontrol et:

- Olay kartı geldiğinde üs sahnesi küçülüyor mu? Kullanıcının bildirdiği “bug1.png” hatası.
- Altı kişilik ekipte kart ya da sahne kayıyor mu?
- Aday ekranı 3 × 2 / 2 × 2 sayfalı mı?
- Mobilde (390 px) yatay taşma var mı?

## Rapor biçimi (`docs/V4_TEST.md`)

1. Kısa özet: en önemli 3 sonuç.
2. Yöntem ve sınırlar.
3. Kimler geçiyor: V3 ve V4 yan yana tablo.
4. V3 bulgularının durumu: madde madde, sayılarla.
5. Yeni özelliklerin değerlendirmesi.
6. Yeni bulunan hatalar ve denge sorunları. Her biri için dosya ve satır, nasıl yeniden üretilir, önerilen düzeltme.
7. Oyuncuyu tutan ve sıkan anlar. Vekil göstergeler: oyun başına duraklama sayısı, karar yoğunluğu, gerilim, “bunu mümkün kılan” anlar.
8. Önerilen sıradaki işler (en fazla 5).
