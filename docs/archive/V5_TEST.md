# V5 bağımsız test raporu: Solbound v0.8 (`0.8.0-landing`)

Tarih: 15 Kasım 2026 · commit `e6230ab` · tablolar: [summary_v5.json](summary_v5.json) · önceki test: [V4_TEST.md](V4_TEST.md), [summary_v4.json](summary_v4.json)

## 1. Kısa özet

**Mentör puanı: 17 / 25** (Etki 3 · Yaratıcılık 4 · Geçerlilik 3 · İlgililik 4 · Sunum 3).

**Sunumu engelleyen hata var mı? Hayır.** Çökme, sayfa hatası ya da kesilen ekran yok:

- 8 canlı oyunda `pageerror` 0.
- 360 ve 390 px dahil her ekranda yatay taşma 0 px.
- Tam e2e Windows'ta 95/95 geçti.

Yine de sunumdan önce yapılması gereken 5 küçük iş var (bölüm 7). En önemlisi B1.

**En önemli 3 sonuç:**

1. **Canlı sitedeki NASA verisi bayat ve açılış kartı jüriye "NASA'ya ulaşılamadı" gösteriyor.**
   - `donki-latest.json`, 14 Kasım 14:06 UTC tarihli. Test sırasında yaklaşık 25 saatlikti.
   - Kod bu dosyayı 6 saatten eskiyse "eski" sayıyor ve `DEMO_KEY` ile NASA'ya gidiyor. 8 koşunun 8'inde, 5 isteğin hepsi **429** döndü.
   - GitHub Action iki kez "başarılı" çalıştı ama hiç commit yapmadı.
   - Oyun yine gerçek kayıtlarla oynanıyor; sorun güven veren durum metninde ve konsoldaki 5 kırmızı hatada.
2. **Denge büyük ölçüde düzeldi ama iniş yeri zorluk etiketleri yanlış.** Toplam 20.000 oyun, yer başına 1.250.
   - Özenli oyuncunun tam başarısı %65,7. Hedef aralık %60–75 içinde (V4: %58,1).
   - Mars baharı hatası (V4 6.1) kapandı: %14,2'den %79,2'ye çıktı (karşılaştırılabilir bot).
   - **Ay ekvatoru** "zor/çok zor" etiketli ama en kolay yer: özenli %73,7–78,8.
   - **Ay kutbundaki "orta" yerler** en zorlar arasında: %46–54.
3. **NASA DONKI verisi oyunda görünüyor, doğru, ama sonucu değiştirmiyor.**
   - Doğruluk: CME tarihi ve hızı kayıtla birebir eşleşti (Gale, `CME/49254`, 873 km/sn).
   - Etki: verili ve verisiz oyunlarda tam başarı %37,7 ve %37,3; özenli oyuncuda %65,3 ve %66,1.
   - Bu, "NASA verisi çözümün temel bileşeni mi?" sorusunda (İlgililik) en zayıf nokta.

## 2. Ortam

| | |
| --- | --- |
| İşletim sistemi | Windows 11 Pro 10.0.26200 |
| Node / npm | v24.17.0 / 11.13.0 |
| Masaüstü tarayıcılar | Google Chrome 157.0.8103.51, Microsoft Edge 157.0.4341.60. **Firefox kurulu değil**, denenmedi. |
| Otomasyon | Playwright (depodaki sürüm), Playwright Chromium 159.0.8154.6. Chrome ve Edge, `channel` ile gerçek kurulu tarayıcı olarak sürüldü. |
| Tarih | 15 Kasım 2026, 11:39–15:05 (yerel saat) |

**Windows ile ilgili notlar:**

- **Bu, e2e'nin Windows düzeltmesinin ilk denemesi.**
  - Sonuç: tam `npm run e2e` **çalıştı ve 95/95 geçti**.
  - `npm run e2e:short` ise Windows'ta **hiç başlamadı** (B8).
  - Her çalıştırmadan sonra öksüz bir `vite preview` süreci kalıyor; ikinci çalıştırma bu yüzden düşüyor (B9).
- **Ortam olayı.**
  - Asıl klasörde `npm ci`, `EPERM` hatasıyla yarıda kaldı. Bu sırada açık olan iki `npm run dev` ve 4181–4185 portlarındaki beş `vite preview` süreci `rolldown-binding.win32-x64-msvc.node` dosyasını kilitliyordu.
  - Bu süreçleri sizin oturumunuza ait oldukları için kapatmadım.
  - **Sonuç: asıl klasörün `node_modules` dizini şu an eksik.** Dev sunucularını kapatıp `npm ci` çalıştırmanız gerekiyor.
  - Depo komutlarının hepsini `git archive HEAD` ile çıkarılan temiz bir kopyada koşturdum. Çalışma ağacında yalnız izlenmeyen `AGENTS.md` vardı; bu yüzden kopya commit ile aynı.

## 3. Mentör puanlaması

Problem başlığı (`docs/MAIN.md`, ilk paragraf): öğrenci bir Ay ya da Mars üssünü yönetirken mühendislik kararlarının bedelini deneyimlemeli. Yaşam desteği, enerji, gıda ve radyasyon ele alınmalı. Oyuncu kararının neden işe yaradığını anlamalı.

| Ölçüt | Puan | Gerekçe ve kanıt | 5'i engelleyen | En ucuz iyileştirme |
| --- | --- | --- | --- | --- |
| **Etki** | **3** | Erişim engeli yok ama sınıfta kullanım için hiçbir şey hazırlanmamış.<br>**Ölçüm:**<br>• ücretsiz, kurulum ve hesap yok, EN/TR<br>• 360 × 740 ve 390 × 844'te 8 ekranın hepsinde taşma 0 px (`live.games[*].overflowPx`)<br>• klavyeyle başlıktan yüzeye kadar oynanıyor (`a11y.keyboard`, 14 Tab ile "Yeni görev")<br>• "Nasıl oynanır" penceresi 5 maddelik ve anlaşılır<br>**Ama:**<br>• ilk karara kadar 5 hazırlık ekranı var: kimlik, hedef, 16 adaydan 3 seçim, 16 eşyalı kargo, brifing<br>• öğretmen için ders planı, süre önerisi ya da tartışma soruları yok<br>• öğrenciyle yapılmış bir kullanım testi yok | Ulaşılan kitle ve öğrenme etkisi kanıtsız. Öğretmenin 40 dakikalık bir derse nasıl sığdıracağı belirsiz. | **Belge, ~1 saat.** README'ye ya da tek sayfalık PDF'e "Derste kullanım" bölümü: 40 dakikalık akış, 16× hız, 3 tartışma sorusu ("Neden batarya, güneş paneli değil?" gibi). Varsa tek bir sınıf denemesinin sayısı. |
| **Yaratıcılık** | **4** | Türün kendisi bilinen bir tür (koloni ve üs yönetimi). Ama "görevin son ayın gerçek Güneş'iyle oynanıyor" fikri özgün.<br>**Hissedilenler:**<br>• CME kartı üç satır gösteriyor: gerçek kayıt, WSA-ENLIL tahmini, oyun kuralı (canlı oyun g2 ve g4)<br>• JPL konum formülüyle sinyal gecikmesi<br>• rastgele iniş kartı, geri sayım bantları, özet filmi; vücut kütlesini içeren 520 kg bütçe<br>**Ama:** DONKI'nin sonuca etkisi ölçülemeyecek kadar küçük (bölüm 6.6). Sinyal gecikmesi yalnız bilgi satırı; oynanışa etkisi yok. | Yenilik yüzeyde kalıyor. Gerçek verinin oyunu değiştirdiği bir an yok. | **Sunum, ~30 dk.** Demoda CME kartını açıp "bu CME 26 Ekim'de Güneş'ten 873 km/sn ile ayrıldı; ekibin bugün yaşadığı o" cümlesini kurun. Kod tarafında en ucuz iş (~2 sa): hızlı CME (>700 km/sn) için sığınak dışı dozu artırmak. |
| **Geçerlilik** | **3** | Teknik olarak sağlam ve tamamlanmış. Bilimsel kaynak düzeni iyi ama hatasız değil.<br>**Teknik:** 66/66 test, 95/95 e2e, 20.000 oyunda motor hatası 0, kaynak sızıntısı yok.<br>**Kaynaklar:** 10 kaynak açıldı. 6'sı iddiayı destekliyor, 3'ü kısmen; **R-MOLD desteklemiyor** (bölüm 4.7).<br>**Belgeler:** README "12 kart" diyor, kodda 31 var. Oyun varsayımları kartlarda ayrı satırda ve `IMPLEMENTATION_NOTES` içinde açıkça yazılı.<br>**Erişilebilirlik:** klavye çalışıyor, `prefers-reduced-motion` çalışıyor (çalışan animasyon 0). axe 3 kontrast ihlali ve başlık sırası hatası buldu.<br>**Maliyet:** "Cost and sustainability" doğru ama yetersiz. Vercel Hobby planının ticari olmayan kullanım şartı, `DEMO_KEY` sınırı, bakımın kimde olduğu ve veri yenilemenin şu an çalışmadığı yazmıyor.<br>**Denge:** iniş zorluk etiketleri yanlış; tıbbi acil durum hâlâ neredeyse kesin başarısızlık (tam başarı %0,7). | Bir kaynak yanlış; README'de bir yanlış sayı; veri yenileme iddiası (Action) şu an doğru değil; zorluk etiketleri ölçümle çelişiyor. | **Belge + yapılandırma, ~1 sa.** `NASA_API_KEY` sırrını ekleyip Action'ı elle çalıştırın. README'de kart sayısını düzeltin. R-MOLD kaynağını değiştirin. Maliyet bölümüne iki cümle ekleyin: Vercel Hobby şartı, `DEMO_KEY` sınırı. |
| **İlgililik** | **4** | Başlığın dört sistemi de karar olarak var:<br>• **yaşam desteği:** MARS-01, MOON-02, EMG-O2, EMG-WATER, RETURN-01 kontrol listesi<br>• **enerji:** batarya, NIGHT, MOON-01, sera modu<br>• **gıda:** CROP, HARVEST kartları, kişi-gün<br>• **radyasyon:** sığınak, CME, MOON-03, su duvarı<br>"Neden" ayağı da var: her kartta şans ve bedel, sonuç kartı ("şans %67 · istendiği gibi gitmedi"), özette "Sistemlerin öğrettikleri" (e2e ekranı `desk-mars-tr-13-debrief`).<br>**Ama** NASA verisi sonucu değiştirmiyor: verili %37,7, verisiz %37,3 tam başarı. | Formdaki 5 puan, NASA verisinin "yeniliği ileriye taşıyan içgörü" sağlamasını istiyor. Şu an bilgilendirici bir katman. | **Sunum, ~15 dk.** Videoda ve demoda "dört sistem → dört karar" eşlemesini README'deki "Fit with the challenge" tablosuyla tek slaytta gösterin. |
| **Sunum** | **3** | Video kısa ve cilalı, ama problemi ve öğrenmeyi anlatmıyor; canlı site ilk bakışta güven kaybettiriyor.<br>**Video:**<br>• 29,8 sn (yerel MP4 ve YouTube `approxDurationMs` 29799); sınır aşılmıyor<br>• "Choose your crew · Pack every kilo · Moon or Mars · Launch · The clock never stops · Every choice has a cost · Bring them home"<br>• 16,5. saniyede gerçek NASA DONKI kaydı kartı<br>• iniş yeri seçimi göstermiyor; oyunun bugünkü hâliyle uyumlu<br>• problem cümlesi yok: "öğrenciler mühendislik bedelini öğrenir" ya da "yaşam desteği, enerji, gıda, radyasyon" geçmiyor; ses kontrol edilmedi<br>• son kare "LoversGG · Powered by AI"<br>**README:** ilk ekranda oyna bağlantısı, video ve "Fit with the challenge" tablosu; ilk bakışta anlaşılır.<br>**Canlı site:** Yapanlar penceresi boş; açılış kartı "NASA'ya ulaşılamadı" diyor. | Problem ve önem videoda açık değil; ekip görünmez. | **Sunum, ~1 sa.** Videonun ilk 3 saniyesine tek satırlık problem cümlesi koymak (yeniden kurgu) ya da sunum anlatımında ilk cümleyle bunu söylemek. Yapanlar'ı doldurmak (5 dk). |
| **Toplam** | **17 / 25** | | | |

**Mentörün yazabileceği genel değerlendirme:**

> Solbound, bir Ay ya da Mars üssünün yaşam desteği, enerji, gıda ve radyasyon dengesini tek bir kütle bütçesi ve gerçek zamanlı bir görev saati üzerinden çok iyi kurgulamış, cilalı ve tamamen oynanabilir bir eğitim oyunu. Gerçek NASA DONKI kayıtlarını görev günlerine eşlemek özgün bir fikir. Ancak şu an bu veri oyunun sonucunu değiştirmiyor; yalnız anlatıyı zenginleştiriyor. Bunun oynanışa etki eden bir karara dönüşmesi projeyi bir üst seviyeye taşır. Sınıf kullanımı için kısa bir öğretmen rehberi, öğrencilerle yapılmış küçük bir deneme ve sitedeki veri yenileme sorununun giderilmesi önerilir.

## 4. Canlı site sonuçları

### 4.1 Oyunlar

**Oyuncu tipi:** Botlar Playwright ile gerçek arayüzde, 16× hızda oynadı.

- **Seçimler:** her kartta ilk açık seçeneği seçti ("görevi bitir / kalkış aracına bin" hariç). Bu, özenli değil, "acemi ama dikkatli" bir oyuncu.
- **Kargo:** 4 eşya denendi. Bazı EN düğme adlarım yanlış olduğu için g1, g2, g4, b-chrome ve b-edge'de 1–2 eşya eklenmedi; oyunun hatası değil.
- **Kalkış saati:** "Eve dön"e basılan bütün oyunlarda kalkış 13:00'te oldu. Bitiş dakikaları 3660, 5100 ve 36780 değerlerinin hepsi günün 13:00'üne denk geliyor.

| Oyun | Tarayıcı · boyut | Seed | İniş yeri (etiket) | Kalkış öncesi aralık | Hedef / tahmin | Dönüş planı | Sonuç |
| --- | --- | --- | --- | --- | --- | --- | --- |
| g1 Ay TR | Chromium 1440×900 | 2115317617 | Mons Mouton (kolay) | 15–30 gün, hedef 12.–25. | 25 / 30 | Hedefte "Eve dön" (26. gün 00:20, "12 sa sonra") | **Evdeyiz, ama bedeli oldu**: su 46/60 L, karneli dönüş. 26 gün, 34 karar, takviye ile 6 kişi. |
| g2 Ay EN | Chromium 1440×900 | 995475337 | Malapert (orta) | 15–25 gün, hedef 12.–21. | 21 / 25 | **30. güne kadar kaldı** | **Home, but at a cost**: karneli dönüş, dönüşte güç arızası. 30 gün, 44 karar, 6 kişi. |
| g3 Mars TR | Chromium 1440×900 | 2091790821 | Utopia Planitia (zor) | 24–28 gün, hedef 20.–23. | 20 / 24 | **Erken "Eve dön"** (4. gün 00:45) | **Evdeyiz, ama bedeli oldu**: "Kalkışta belirlenen hedeften önce döndünüz". 9 karar. |
| g4 Mars EN | Chromium 1440×900 | 3034734154 | Gale Crater (zor) | 29–30 gün, hedef 24.–25. | 25 / 30 | Hedefte "Eve dön" (26. gün 01:52, "in 11 h") | **Everyone came home** (success). 26 gün, 31 karar, 2 DONKI CME'si (873 ve 357 km/sn). |

**Hafif hata:** g4'te sonuç "success" olduğu hâlde özet şunları gösteriyor:

- "Your crew completed the **30-day** mission" (oysa 26 gün).
- "**Why not a full success?**" başlığı.

Bu, B7.

### 4.2 Tarayıcılar (ilk 3 gün, "Eve dön" ve özet)

| Tarayıcı | Seed · yer | Sonuç | Konsol | Taşma |
| --- | --- | --- | --- | --- |
| Chrome 157.0.8103.51, EN, 1366×768 | 2559619333 · Shackleton | Özet, PNG kart ve kopyalama çalıştı. Açılış 536 ms. | Yalnız 5 × 429 (DEMO_KEY) | 0 |
| Edge 157.0.4341.60, TR, 1366×768 | 76446112 · Meridiani Planum | Özet ve PNG kart çalıştı | Yalnız 5 × 429 | 0 |
| Firefox | — | **Denenmedi** (kurulu değil) | — | — |

### 4.3 Mobil

| Boyut | Seed · yer | Akış | Taşma (8 ekran) | Gözlem |
| --- | --- | --- | --- | --- |
| 390 × 844, EN | 3658881666 · Procellarum | başlık → hazırlık → görev → "Eve dön" → özet | 0 px | Hız düğmeleri artık sığıyor (V4'te 7 px taşıyordu). |
| 360 × 740, TR | 3649575266 · Elysium Planitia | aynı | 0 px | Kargo kartları, alt "Geri/İleri" çubuğu ve özet düğmeleri kesilmiyor; yazılar okunur (ekranlar `m360-05-cargo`, `-08-surface`, `-13-debrief`). Üst bilgi alanı ilk ekranın yarısını kaplıyor; sahne ancak kaydırınca görünüyor. |

### 4.4 Ölçümler

| Ölçüm | Değer |
| --- | --- |
| İlk açılış, soğuk önbellek, Chrome masaüstü | `load` 534 ms · LCP 1.252 ms · ağ boşa düşme 2,7 sn · **451 KB** aktarım (TR dil parçası ve latin-ext yazı tipi dahil) |
| İlk açılış, 390 px, 9 Mbit / 150 ms yavaşlatmayla | `load` 692 ms · LCP 1.388 ms · **297 KB** |
| En büyük dosyalar | `Title-*.js` 96 KB · Inter latin-ext 83 KB · `client-*.js` 65 KB · `tr-*.js` 52 KB (gzip/br sonrası) |
| Konsol hataları | Her koşuda tam 5 `error`, hepsi DONKI `DEMO_KEY` 429. Başka hata ya da uyarı yok. `pageerror` 0. |
| Başarısız istekler | Yalnız `api.nasa.gov/DONKI/{CME,FLR,SEP,GST,IPS}?api_key=DEMO_KEY` → 429 (8/8 koşu) |
| Canlı paketler | 20 dosya; yerel `npm run build` çıktısıyla **bayt bayt aynı**, yani canlı site `e6230ab`. |

### 4.5 DONKI

- **`donki-latest.json`:**
  - `fetchedAt` = **2026-11-14T14:06:32.680Z**. Test anında yaklaşık 25 saatlik, **2 günden yeni**.
  - `failed: ["FLR"]`, 89 kayıt, 86 CME.
  - Uyarı: dosya Action'dan değil, elle üretilmiş. GitHub'daki son değişikliği 14 Kasım 14:56 tarihli, kullanıcı commit'i.
- **GitHub Action çalışmıyor olabilir.** `DONKI snapshot` 14 Kasım 22:28 ve 15 Kasım 06:39'da "success" ile bitmiş, ama hiç commit yok. Neden olduğunu okuyamadım; iş günlükleri giriş gerektiriyor. Muhtemel neden:
  - `NASA_API_KEY` sırrı tanımlı değil.
  - Betik bu durumda sessizce `DEMO_KEY`'e düşüyor (`scripts/donki-snapshot.ts:9`).
  - `DEMO_KEY` de GitHub'ın paylaşılan IP'sinden başarısız oluyor.
- **Açılış kartı:**
  - Gösterilen metin: "NASA'ya ulaşılamadı, kayıtlı veri gösteriliyor · Kayıtlar 2026-10-15 – 2026-11-14 · İndirildi 14 Kas 17:06 (kayıtlı kopya) · 86 CME · M/X patlaması alınamadı".
  - Teknik olarak doğru: `DEMO_KEY` gerçekten 429 aldı.
  - Ama yanıltıcı: veri NASA'dan alınmış ve bir günlük. "Kısmen güncel" etiketi bu koşullarda hiç görünmüyor.
  - Neden: `src/live/useSpaceWeather.tsx:15`, `STATIC_MS` = 6 saat.
- **Brifing:** "Bu görevin gerçek uzay havası: 2026-10-15 – 2026-11-14 (kayıtlı kopya). Mars için beklenen CME varışı: 10." Kaynak doğru söyleniyor.
- **CME eşleşmesi:**

  | Oyunda | `donki-latest.json` |
  | --- | --- |
  | g4 (Gale), görev dakikası 23040, yani 16. gün: "CME observed 2026-10-26 09:00 UTC, about 873 km/s · Estimated arrival here: 2026-10-31 00:00 UTC" | `2026-10-26T09:00:00-CME-001`, speed 873, arrivalMars `2026-10-31T00:00Z`, `CME/49254` → **eşleşiyor** |
  | g1/g2 (Ay), dakika 8280: "2026-10-16 12:38 UTC, 247 km/s, varış 2026-10-20 18:00" | `2026-10-16T12:38:00-CME-001`, 247, arrivalEarth `2026-10-20T18:00Z` → **eşleşiyor** |

  Görev başlangıcı 15 Ekim'e eşleniyor. 31 Ekim varışı oyunda 16. güne denk geliyor. "Aynı gün" iddiası doğru.

### 4.6 API anahtarı güvenliği

- Canlı sitedeki **20 `assets` dosyası indirildi**.
- `api_key=` yalnız `Title-*.js` içindeki şablonda geçiyor: `api_key=${encodeURIComponent(e)}`.
- `DEMO_KEY` var.
- 40 karakterlik `[A-Za-z0-9]{40}` dizgi sayısı: **0**.
- **Gerçek anahtar yok.**

### 4.7 Araştırma kaynakları (10 açıldı)

| Kart | Kaynak | Sonuç |
| --- | --- | --- |
| R-WATER | ISS su geri kazanımı | **Destekliyor** ("total water recovery of 98%", önce "93 and 94%") |
| R-SPE | OCHMO radyasyon PDF'i (`pdftotext`) | **Kısmen.** "rearranging items such as water containers and/or high hydrogen content materials" ve "timely reporting to alert crew to seek shelter" var. "Ay yüzeyinde dış çalışma özel risk" ifadesini bulamadım; belge "Lunar surface provides significant protection vs. free space" diyor. |
| R-MOXIE | Perseverance aletleri | **Destekliyor**: 122 g ve "12 grams of oxygen an hour". Sayfanın özellik tablosunda "up to 10 g/h" da var. |
| R-WIND / R-SEASON | Mars toz fırtınaları | **Kısmen.** 60 mph, kıta boyu, 3 Mars yılı ve güney yazı doğru. "Ekipmanı devirememesi" sayfada rüzgâra bağlanıyor, "ince hava" yalnız ima ediliyor. |
| R-MOON-DUST | Ay tozu | **Destekliyor** ("lunar hay fever", elektrik yükü) |
| R-MOON-POLE | Shackleton | **Destekliyor** |
| R-MOONQUAKE | Küçülen Ay | **Destekliyor.** Görsel altyazısı merkez üssünün kesin belirlenemediğini söylüyor. |
| R-MICRO | Ay çarpma izleme | **Destekliyor**: 20–72 km/sn, 5 kg → 9 m krater. Sayfada bir yerde "up to 70 km/sec" da var. |
| R-MOON-O2 | Sanders 2024 ISRU PDF'i | **Kısmen.** "Lunar regolith is >40% oxygen (O2) by mass" var; "enerji yoğun çıkarım" ifadesini bu PDF'te bulamadım. |
| **R-MOLD** | "Teams Persevere Through Plant Challenges" | **Desteklemiyor.** Sayfa VEG-05 cüce domatesleriyle ilgili: nem düşüşü ve olası mantar kirliliği. Zinnia, hava akışı ve ölen bitki geçmiyor. |

**Oyun varsayımları açıkça ayrılmış mı? Evet.**

- Kartlarda "GERÇEK KAYIT / MODEL TAHMİNİ / OYUN ETKİSİ (BİZİM KURALIMIZ)" satırları var (CME kartı).
- Araştırma kartlarında `claim` ve `inGame` ayrı.
- `landing.ts` başlığında "the numbers are game values" yazıyor.

### 4.8 Özet filmi

| | Sonuç |
| --- | --- |
| Video | **Çalışıyor.** `solbound-mars-ylec4l.webm`, 4,9 MB, 720×720. Chromium'da oynuyor; 1,5 sn'de `currentTime` 1,51, hata yok. Dosyada süre bilgisi yok (`duration` Infinity; B13). |
| Yüzler | **Oyundaki portrelerle aynı.** PNG kartta 4 SVG portre (Ryan, Sam, Claire, Hannah), oyundaki çizimle aynı tarz. |
| PNG kart | **Çalışıyor.** 8/8 koşuda indi. |
| Kopyalama | **Çalışıyor.** 7 koşuda pano metni okundu. g3'te düğme adı eşleşmediği için denenmedi. EN metinde dil hatası: "on the **The Moon**", "on the **Mars**" (B3). |

### 4.9 v0.8 kontrol listesi

| Değişiklik | Durum | Kanıt |
| --- | --- | --- |
| Rastgele iniş ve iniş ekranındaki yer kartı | **Çalışıyor** | 8 koşuda 8 farklı yer. Kartta ad, etiket, açıklama ve 5 madde var ("Bu yerle üs yaklaşık 24 gün dayanır. Görev hedefi: 20."). |
| Kalkıştan önce tahmin aralığı | **Çalışıyor** | Kargo ve brifingte "15–30 gün, hedef 12.–25." gibi. Taramada 3.048 oyunda kesin tahmin her zaman aralıkta (bölüm 6.2). |
| 13:00 kalkış penceresi | **Çalışıyor** | Canlıda 7/7. Taramada 14.259/14.259 kalkış 13:00'te. |
| "Tahminin ötesinde" derecesi | **Canlıda görülmedi** | İlk-seçenek botu tahmine ulaşamadı. Motor taramasında özenli oyuncunun %65,7'si bu dereceyi aldı. Metin `more6_tr.ts:64`'te var. |
| Stres 98'de ekip krizi kartı | **Görülmedi** | Canlıda yok. Taramada 20.000 oyunun yalnız 17'sinde açıldı; özenli oyuncuda hiç açılmadı (B10). |
| Fırtınadan sonra sığınaktan çıkış | **Çalışıyor** (sınırlı kanıt) | g4'te 2 toz fırtınası, sonda herkes `sheltered:false`. Taramada sığınakta biten 38 oyunun hepsi olay sürerken kayıp ya da iptalle bitti; tamamlanan hiçbir oyun sığınakta bitmedi. |
| Brifingteki DONKI açıklaması | **Çalışıyor** | `[data-testid=sw-explain]`, e2e PASS, metin yukarıda. |
| Yapanlar penceresi | **Sorunlu** | Açılıyor ama yalnız NASA teşekkürü var; takım adları ve portföy boş (`src/credits.ts`). |
| "Neden iki saat?" düğmesinin kaldırılması | **Çalışıyor** | Yüzeyde düğme sayısı 0 (8/8). `time.why` anahtarı i18n'de ölü kalmış (B14). |

### 4.10 Erişilebilirlik (axe-core 4.10.2 ve klavye)

- **Klavye:** "Yeni görev"e 14 Tab ile ulaşıldı. Kimlik, hedef, 3 ekip üyesi, kargo, brifing, kalkış, ilk karar ve yüzey **yalnız klavyeyle** tamamlandı. `:focus-visible` stili tanımlı (`styles.css:89`).
- **`prefers-reduced-motion`:** CSS kuralı (`styles.css:2168`) ve JS kontrolleri var. Taklit edilen ayarla başlıkta ve yüzeyde çalışan animasyon sayısı 0.
- **axe ihlalleri:**
  - Kontrast "serious": `.random-landing > .fine` 3,69:1 (hedef ve brifing ekranı); sera modu ve örtü radyo etiketleri 3,89:1 (yüzey). Kaynak: `--faint: #7d88a0`.
  - Orta düzey: `heading-order` (başlık, Nasıl oynanır, ekip, kargo); yüzeyde `page-has-heading-one`.
- **Ekran okuyucu ile gerçek test yapılmadı.** Kaynakta 36 `aria-label`, 9 `aria-live`, diyaloglarda `role="dialog"` var.

## 5. Depo sonuçları

| Komut | Sonuç | Süre |
| --- | --- | --- |
| `npm ci` (asıl klasör) | **Başarısız**: `EPERM unlink …rolldown-binding.win32-x64-msvc.node`. Açık vite süreçleri dosyayı kilitliyor. | — |
| `npm ci` (temiz kopya) | Başarılı, 0 güvenlik açığı | 3,3 sn (sıcak önbellek) |
| `npm run typecheck` | Hatasız | 1,5 sn |
| `npm test` | **66/66**, 3 dosya | 32,1 sn |
| `npm run build` | Başarılı (vite 320 ms) | 1,9 sn |
| `npm run e2e:short` | **Başlamadı**: `'E2E_SHORT' is not recognized as an internal or external command` | — |
| `E2E_SHORT=1 node scripts/e2e.mjs` (bash) | **62/62** | 34,6 sn |
| Aynısının ikinci denemesi | **Başarısız**: `Error: preview did not start`. Önceki çalıştırmanın öksüz `vite preview` süreci 4179 portunu tutuyordu. | 20,8 sn |
| `npm run e2e` (tam) | **95/95** | 255,9 sn |

**E2E notları:**

- Node uyarısı: `[DEP0190] Passing args to a child process with shell option true…`
- Tam koşu sonuçları:
  - Masaüstü Mars TR "Görev kaybedildi" ile bitti.
  - Mobil Ay EN "Home, but at a cost" ile bitti.
  - "chat bubble visible before event 2: false", iki koşuda da.
- **Ekran görüntüleri** (`e2e-screens/`, temiz kopyada):
  - İniş kartı, 390 px yüzey ve özet temiz.
  - Özet günlüğünde "Test \<b\>Pilot\</b\> hayatını kaybetti" düz metin olarak görünüyor; HTML kaçışı çalışıyor.
  - 390 px'te hız düğmeleri tek satıra sığıyor.

**Bağlantılar:** `README.md` içindeki 11 ve `docs/README.md` içindeki 13 bağlantının hepsi açılıyor. Dış bağlantılar (site, YouTube) 200 döndü.

**README iddiaları:**

| İddia | Durum |
| --- | --- |
| 520 kg, vücut kütlesi dahil | Doğrulandı (`cargo.ts:8`, ekran "kg / 520 kg") |
| DONKI olayları aynı günlerde, gerçek tarih ve hızla | Doğrulandı (bölüm 4.5) |
| JPL yaklaşık konum formülü | Kodda ve testlerde var (`src/engine/time.ts`); Horizons'a karşı yeniden ölçmedim |
| **"12 cards that cite 25 NASA and JPL sources"** | **Yanlış:** 31 kart (Ay 23, Mars 21). 25 benzersiz URL doğru. |
| **"A scheduled GitHub Action refreshes the NASA data"** | **Şu an doğru değil:** Action commit yapmıyor |
| "No analytics" | Doğrulandı: ağda yalnız vercel.app ve api.nasa.gov |
| "Runs on a laptop or a phone" | Doğrulandı: 360 ve 390 px |
| "Requires Node.js 20.19+" | Denenmedi (Node 24 kullanıldı) |
| "Every decision shows its chance and cost" | Doğrulandı (sonuç kartında "şans %67") |

## 6. Denge taraması

### 6.1 Yöntem ve sınırlar

**Yöntem:**

- **Motor:** gerçek motor ve `applyCommand`.
- **Kurulum:** oyuncu ve 16 aday seed'den üretildi; ekipten 3 kişi rastgele seçildi; kargo `setCargo` ile gerçek 520 kg kontrolünden geçti; kalkış normal `launch` komutuyla yapıldı.
- **İniş yeri:** `setSite` **kullanılmadı**. Her oyun için iniş yeri `pickLanding(seed)` istenen yer çıkana kadar seed ilerletilerek seçildi. Böylece yer, oyunun kendi rastgele inişi oldu ama yer başına örnek eşit kaldı.
- **Parçalar:** `prepared()` ve `launchAnyway()` kullanılmadı. Çalışma 4 × 5.000 oyunluk parçaya bölündü, ayrı Node işlemlerinde paralel koştu. Toplam 503 sn, **20.000 oyun, 0 hata**, yer başına 1.250.
- **Saat adımı:** 6 saat (V4 ile aynı); motor olay eşiğinde duruyor.
- **Betikler:** depoya eklenmedi; geçici kopyada kaldı.

**Eksenler:**

- Hedef: Ay / Mars %50 / %50, 8 yerin her biri eşit.
- Kargo: boş %10, az %25, rastgele %35, dolu %30.
- Mod: keşif %25.
- DONKI anlık görüntüsü (`public/donki-latest.json`): %50 var, %50 yok.
- Takviye teklifi: kabul, kargo ve ret eşit olasılıkla.
- MARS-02: "hunker" ve "eco" yarı yarıya.

**Oyuncu tipleri:**

- **Özenli (%25):** V4 tercihleri, bütün hazırlıklar. Tahmin gününe ulaşınca "Eve dön"; tahmin 29 ve üstüyse 30. güne kalır. Yeni "tahminin ötesinde" kademesini hedefler.
- **Özenli-hedef (%10):** Aynı kararları verir ama **hedefte** döner. V4'teki "özenli" ile karşılaştırılabilir bot budur.
- **Karışık (%25):** Kararların %70'i özenli, %30'u rastgele; hazırlıkların %70'i. Hedef ile tahmin arasında rastgele bir günde döner.
- **Rastgele (%20):** Eşit olasılıkla seçer, hazırlıkların %50'si. Yarısı hedefte döner, yarısı kalır.
- **Pervasız (%10):** V3 ve V4 pervasız tercihleri, hazırlık yok, "Eve dön" yok.
- **Erken dönen (%10):** Özenli gibi oynar, 2. gün ile hedefin bir gün öncesi arasında rastgele bir anda döner.

**Sınırlar:**

- Bu deney düzeni için yapılan seçimler:
  - Ekip krizi kartı ve EMG-MED'de, rastgele ve pervasız dışındaki botlar seçeneği eşit olasılıkla seçti. Amaç seçenekleri karşılaştırmaktı.
  - Botlar araştırma kartı açmaz, rutin, güç önceliği, sera modu ya da örtü değiştirmez. Görev atamasında `suggestCrew` kullanırlar.
- Ölçümle ilgili notlar:
  - Yer başına özenli örnek yaklaşık 300; %95 güven aralığı yaklaşık ±5,5 puan.
  - İlk taramadaki tahmin aralığı kontrolü bir örnekleme hatası yüzünden yalnız Ay oyunlarını (2.500) kapsadı. Bu yüzden 548 Ay ve Mars oyunuyla ayrıca doğrulandı.
  - "Bekleme sırasında ölüm" sayımı, basış anındaki canlı sayısıyla sondaki ölü sayısının farkıdır; nedensellik değildir.

### 6.2 Kimler geçiyor; V4 ile karşılaştırma

"Tam" = başarı + tahminin ötesinde.

| Oyuncu | n | Tam | Tahminin ötesinde | Kısmi | Erken bitiş | Kayıp | V4 tam / kayıp |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Genel | 20.000 | %37,5 | %18,7 | %42,6 | %14,0 | %5,9 | %29,4 / %7,0 |
| Özenli (tahmine kadar kalır) | 4.875 | **%65,7** | %65,7 | %30,7 | %2,1 | %1,5 | V4 özenli-kalan %48,7 / %7,7 |
| Özenli-hedef (V4 "özenli") | 1.875 | **%72,3** | 0 | %25,0 | %1,2 | %1,4 | %58,1 / %2,2 |
| Karışık | 5.113 | %48,7 | %9,8 | %42,2 | %7,0 | %2,1 | %43,2 / %3,5 |
| Rastgele | 4.070 | %11,0 | %1,0 | %48,5 | %33,1 | %7,4 | %3,9 / %13,7 |
| Pervasız | 1.991 | %0 | 0 | %19,0 | %48,0 | **%33,0** | %0,2 / %16,9 |
| Erken dönen | 2.076 | %0 | 0 | %99,1 | %0,7 | %0,2 | %0 / %0,8 |

**Hedef ve temel tipe göre** (V4 özenli ile karşılaştırma, V5'te özenli-hedef):

| Temel tip | V4 özenli | V5 özenli-hedef | V5 özenli (tahmin) |
| --- | --- | --- | --- |
| Mars bahar | %14,2 | **%79,2** | %75,0 |
| Mars yaz | %55,3 | %73,2 | %56,6 |
| Ay ekvator | %82,7 | %78,6 | %76,5 |
| Ay kutup | %79,6 | **%62,8** | %58,9 |

**Diğer eksenler:**

- **Keşif modu:** kayıp %0; tam %37,7, standart modda %37,4. Tasarlandığı gibi.
- **Kargo:** boş %33,6, az %34,4, rastgele %37,3, dolu %41,4 tam. V4'te boş ile rastgele arası fark 23,5 / 31,2 idi.
- **Tam başarı olmamasının nedenleri** (oyun sayısı):
  - Karneli dönüş: 5.522.
  - Sert iniş: 3.480.
  - Erken bitiş: 2.935.
  - Hedeften önce dönüş: 2.057.
  - Kayıp: 1.368.
  - Tahliye: 783.
- **Kalış ve bilim:** özenli oyuncu ortalama 21,3 gün kalıp 241 bilim puanı topluyor; özenli-hedef 17,3 gün ve 198 puan. Tahmine kadar kalmanın artık bir karşılığı var (V4 6.2 düzeldi). Yine de hedefte dönmek **daha güvenli**: tam başarı %72,3'e karşı %65,7.

### 6.3 Soru 1: İniş yeri zorluk etiketleri

"Özenli" sütunu, tahmine kadar kalan bot için. Bu botta bütün tam başarılar "tahminin ötesinde" derecesi. Önerilen etiket şu eşiklere göre: özenli tam ≥%72 kolay, %60–72 orta, %48–60 zor, <%48 çok zor.

| Yer | Temel tip | Etiket | Özenli tam (= ötesinde) | Özenli-hedef tam | Rastgele kayıp | Medyan tahmin / hedef | Önerilen |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Shackleton | Ay kutup | kolay | %70,3 | %69,5 | %8,4 | 25 / 21 | orta (sınırda) |
| Mons Mouton | Ay kutup | kolay | %74,3 | %85,1 | %6,9 | 25 / 21 | kolay ✓ |
| **Malapert** | Ay kutup | orta | **%46,1** | %52,2 | %6,9 | 25 / 21 | **çok zor** |
| **Nobile** | Ay kutup | orta | %48,7 | %60,7 | **%11,1** | 24 / 20 | **zor** |
| **Haworth** | Ay kutup | orta | %53,7 | %47,4 | %8,7 | 24 / 20 | **zor** |
| **Tranquillitatis** | Ay ekvator | zor | %73,7 | %77,1 | %8,1 | 15 / 12 | **kolay** |
| **Marius Tepeleri** | Ay ekvator | zor | **%78,8** | %81,7 | %8,5 | 16 / 13 | **kolay** |
| **Procellarum** | Ay ekvator | **çok zor** | %76,6 | %76,8 | %10,9 | 15 / 12 | **kolay** |
| Jezero | Mars bahar | orta | %72,8 | %76,8 | %5,8 | 23 / 19 | kolay (sınırda) |
| Elysium | Mars bahar | kolay | %77,6 | %81,8 | %5,1 | 24 / 20 | kolay ✓ |
| Arcadia | Mars bahar | orta | %73,7 | %78,8 | %5,4 | 20 / 17 | kolay (sınırda) |
| **Utopia** | Mars bahar | zor | %76,1 | %79,5 | %4,8 | 20 / 17 | **kolay** |
| Gale | Mars yaz | zor | %62,9 | %75,9 | %4,4 | 23 / 19 | orta |
| Meridiani | Mars yaz | orta | %68,4 | %86,1 | %9,0 | 24 / 20 | orta ✓ |
| Valles Marineris | Mars yaz | zor | %53,5 | %67,6 | %9,1 | 23 / 19 | zor ✓ |
| Hellas | Mars yaz | çok zor | **%40,8** | %66,4 | %6,0 | 23 / 19 | çok zor ✓ |

**Yorum:**

- **Ay ekvatoru ters etiketli.** Tahmin her oyunda bataryayla (Ay gecesi) sınırlı: tahmin 15, hedef 12. Ekip geceye girmeden döndüğü için ekvator en kolay yer oluyor. Hedefin yere göre ayarlanması, fiziksel zorluğu sonuçtan siliyor. Gece zorluğu oyuncuya ancak tahminin ötesinde kalırsa yansıyor.
- **Ay kutbundaki üç "orta" yer, Ay'ın gerçekten zor yerleri.** Malapert'te su ve deprem, Nobile ve Haworth'ta güneş ve sera çarpanları etkili.
- **Mars yazı** sıralaması doğru: Meridiani > Gale > Valles > Hellas.
- **Mars baharındaki dört yer** istatistik olarak ayırt edilemiyor (%72,8–77,6); Utopia'nın "zor" etiketi desteklenmiyor.
- `IMPLEMENTATION_NOTES`, etiketlerin "aynı tipteki yerleri sıraladığını" söylüyor. Ama hedef ekranı 8 yeri tek listede gösterdiği için oyuncu etiketleri mutlak okuyor.

### 6.4 Soru 2: Tahmin aralığı (`estimateRange`)

- **Ana tarama:** 2.500 Ay oyununda, iniş sonrası kesin tahmin **2.500'ünde aralığın içinde** ve `bySite[iniş yeri]` ile **birebir aynı**.
- **Ek doğrulama:** Ay ve Mars karışık 548 oyun, yarısında DONKI verisi. Sonuç **548/548** içinde ve aynı.
- **Toplam 3.048/3.048.** DONKI verisi tahmini değiştirmiyor; `estimateStay` uzay havasını bilerek siliyor.
- **Medyan aralık genişliği** 10 gün (Ay: 15–30 gibi). Mars'ta aralık dar (canlıda 24–28 ve 29–30).

### 6.5 Soru 3: Kalkış penceresi

- **"Eve dön"e basılan oyun:** 14.283. Kalkışların **hepsi 13:00'te** (14.259; kalan 24 oyun kalkıştan önce başka nedenle bitti). Medyan bekleme 5 saat.
- **Hedefte ya da sonra basıp yine "hedeften önce döndün" alan oyun: 0** (12.222 basıştan).
- **Beklerken ölüm:** 61 oyunda (%0,43) basıştan sonra ölüm oldu.
  - 35'i kayıp, 29'u iptalle bitti.
  - Oyuncu tipine göre: rastgele 24, karışık 16, özenli 12, özenli-hedef 6, erken dönen 3.
  - Bu oyunlardan yalnız **1'inde** basış anında kontrol listesi "hazır"dı. Ölenler zaten krizdeydi; pencere yeni bir ölüm kaynağı gibi görünmüyor.
- **Basışta hazır, kalkışta karneli:** 96 oyun (%0,7). 13:00'e kadar beklemenin bir kaynağı eksiğe düşürdüğü durumlar bunlar. Az ama sıfır değil.
- **Basışta hazır değil:** 9.221 oyunda basış anında kontrol listesi "hazır değil"di; çoğu gece bataryası. Bunların 4.116'sı karneli dönüşle bitti; kalanında 13:00 penceresi sorunu çözdü.

### 6.6 Soru 4: Stres ve kriz (CREW-CRISIS)

- **Açılma sıklığı:** 20.000 oyunun yalnız **17'sinde** (%0,1) açıldı, toplam 47 kart. Özenli ve özenli-hedef oyuncuda **0**, karışık ve rastgele oyuncuda %0,2.
- **Stres eşiği:** stresin 98'e ulaştığı oyun payı %0,3.
- **Seçeneklere göre sonuç:** örnek çok küçük.

  | İlk seçim | n | Tam | Kayıp |
  | --- | --- | --- | --- |
  | konuş | 8 | %25 | %25 |
  | devam | 6 | %33 | 0 |
  | izin günü | 3 | %33 | 0 |
  | moral kiti | 0 | — | — |

- **Sonuç:** Özellik çalışıyor ama oyuncuların neredeyse hiçbiri görmeyecek. Sunumda anlatılmamalı ya da eşik indirilmeli (B10).

### 6.7 Soru 5: EMG-MED `treatCause`

- **Sıklık:** EMG-MED oyunların %16,8'inde (3.357 oyun) görüldü.
- **Sonuç:** görüldüğü oyunlarda **tam başarı %0,7**, kayıp %34,9. V4'te tam başarı %0,4 idi. **Hâlâ neredeyse kesin başarısızlık.**
- **Seçeneklere göre** (ilk seçim):

  | Seçenek | Eşit seçen botlar: n · tam · kayıp | Rastgele oyuncu: n · tam · kayıp |
  | --- | --- | --- |
  | **treatCause** | 272 · %6,3 · **%46,0** | 306 · %1,0 · **%54,9** |
  | stabilize | 22 · %9,1 · %27,3 | 184 · 0 · %20,7 |
  | medkit | 62 · %1,6 · %32,3 | 105 · 0 · %30,5 |
  | medic | 34 · %2,9 · %70,6 | 53 · 0 · %60,4 |
  | evacuate | 88 · 0 · %39,8 | 102 · 0 · %32,4 |
  | abort | 200 · 0 · 0 (%100 iptal) | 209 · 0 · 0 |

- **Yorum:** `treatCause` **baskın değil, gereksiz de değil.** Tam başarı payı en yüksek seçeneklerden biri; ama kayıpta stabilize ve medkit'ten kötü.
  - Olası neden: onarım bir görev; hasta o arada dengelenmiyor.
  - Önerim: `treatCause` hem nedeni onarsın hem hastaya küçük bir sağlık desteği versin. Kartın sağlık 35 yerine 50'de açılması da denenebilir (B11).

### 6.8 Soru 6: DONKI etkisi (İlgililik kanıtı)

| | Verisiz (n) | Verili (n) |
| --- | --- | --- |
| Genel: tam / kayıp | %37,3 / %5,7 (9.999) | %37,7 / %6,0 (10.001) |
| Ay: tam / kayıp | %36,8 / %7,5 | %37,0 / %7,9 |
| Mars: tam / kayıp | %37,7 / %3,9 | %38,4 / %4,1 |
| Özenli Ay | %65,6 | %65,7 |
| Özenli Mars | %66,6 | %64,8 |

- **Verili oyunlardaki CME'ler:** oyun başına ortalama 1,94 gerçek CME (Ay 1,67, Mars 2,21); oyunların %90,8'inde en az biri çarptı. Verisiz oyunlarda CME büyük olayı 0.
- **CME çarpan ve çarpmayan oyunlar:**
  - Özenli: tam %65,1 / %70,5 (çarpmayan n = 61).
  - Rastgele: kayıp %7,8 / %0 (çarpmayan n = 113).
- **Sonuç:** Gerçek veri oyunu **bilgi ve anlatı olarak** zenginleştiriyor (tarih, hız, model tahmini, NASA bağlantısı). **Sonuç oranlarını değiştirmiyor.** V4'te de böyleydi: %29,1 / %29,6.

### 6.9 Soru 7: Genel denge

- **Özenli oyuncu:** hedef aralık yaklaşık %60–75 tam başarı. Ölçüm **%65,7** (tahmine kadar kalan) ve **%72,3** (hedefte dönen); ikisi de aralıkta. V4: %58,1.
  - Temel tipe göre (özenli, tahmin): Mars bahar %75,0, Ay ekvator %76,5 (ikisi de üst sınırın biraz üstünde); Ay kutup %58,9 ve Mars yaz %56,6 (alt sınırın biraz altında).
- **Rastgele oyuncunun kaybı:** %7,4 (V4 %13,7) azaldı.
- **Pervasız oyuncunun kaybı:** %33,0 (V4 %16,9) arttı. Pervasız oynamanın bedeli artık daha belirgin.
- **Takviye ekip:** teklif Ay oyunlarının %44,3'ünde geldi (yalnız hedef ≥20 olduğunda). Altı kişilik ekip 1.007 oyunda oluştu.
  - Kabul: tam %36,3, kayıp %10,1.
  - Kargo: tam %30,8, kayıp %7,1.
  - Ret: tam %29,3, kayıp %7,7.
  - Kabul artık hem en yüksek ödülü hem en yüksek riski taşıyor (V4'te fark 2,5 puandı). İyi.

## 7. Hatalar

### Sunumdan önce mutlaka

| # | Hata | Dosya / satır | Yeniden üretme | Önerilen düzeltme |
| --- | --- | --- | --- | --- |
| **B1** | DONKI verisi bayat. Site `DEMO_KEY` ile 5 istek atıp 429 alıyor; açılış kartı "NASA'ya ulaşılamadı" diyor; konsolda 5 kırmızı hata var. Action yeşil ama commit yapmıyor. | `src/live/useSpaceWeather.tsx:15` (`STATIC_MS` 6 sa), `scripts/donki-snapshot.ts:9` (anahtar yoksa sessizce `DEMO_KEY`), `.github/workflows/donki-snapshot.yml` | Gizli pencerede siteyi açın; 8/8 koşuda tekrarlandı. Jüri aynı ağdan girerse durum aynı. | 1) GitHub'da `NASA_API_KEY` sırrını ekleyip Action'ı `workflow_dispatch` ile çalıştırın. 2) Betik anahtar yoksa `exit 1` versin; böylece Action kırmızı olur. 3) İsteğe bağlı: `STATIC_MS`'yi 48 saate çıkarın, ya da metni "Sitenin NASA kopyası · 1 gün önce" yapın. |
| **B2** | Yapanlar penceresi boş | `src/credits.ts:5-10` | Başlık → Yapanlar | İsimleri ve rolleri doldurun. |
| **B3** | EN paylaşım metni: "on the The Moon", "on the Mars" | `src/i18n/more2_en.ts:361` | EN oyun → özet → "Copy summary text" (b-chrome, g4) | "on {dest}" yerine hedefe göre ayrı metin kullanın. |
| **B4** | README'de "12 research cards"; kodda 31 kart | `README.md:52` | `grep -c "id: 'R-" src/engine/research.ts` → 31 | "31 research cards (23 for the Moon, 21 for Mars)" |
| **B5** | R-MOLD kaynağı iddiayı desteklemiyor | `src/engine/research.ts:141`, `src/i18n/more4_en.ts:176` (+ TR) | Bağlantıyı açın: zinnia yok, VEG-05 domates var | Zinnia küf olayını anlatan NASA sayfasını bulup bağlayın, ya da iddiayı bu sayfadaki nem ve mantar riskine göre yeniden yazın. |

### Sonra

| # | Hata | Dosya / satır | Yeniden üretme | Önerilen düzeltme |
| --- | --- | --- | --- | --- |
| B6 | İniş yeri zorluk etiketleri ölçümle çelişiyor | `src/engine/landing.ts:35-53` | Bölüm 6.3 tablosu | Etiketleri önerilen değerlere çekin; ya da etiketi "hayatta kalma zorluğu" değil "çevre zorluğu" diye adlandırın. |
| B7 | "success" sonucunda "Why not a full success?" başlığı; açıklama "30-day mission" diyor (26 günde) | `src/engine/outcome.ts:58`, `src/ui/screens/Debrief.tsx:47`, `src/i18n/en.ts:678`, `src/i18n/more2_en.ts:13` | Seed 3034734154, Mars, hedefte dön (g4) | Başarı için başlık "How to reach the top tier"; açıklama gün sayısını kullansın. |
| B8 | `npm run e2e:short` Windows'ta başlamıyor | `package.json:15` | Windows'ta `npm run e2e:short` | `node scripts/e2e.mjs --short` ya da `cross-env` |
| B9 | E2E Windows'ta `vite preview`'u öksüz bırakıyor; sonraki çalıştırma "preview did not start" | `scripts/e2e.mjs:16`, `:454` | `npm run e2e` iki kez üst üste | Kabuk olmadan `process.execPath` + `node_modules/vite/bin/vite.js` başlatın, ya da Windows'ta `taskkill /pid … /T /F`. Port hatası stderr'de; onu da yakalayın. (4181–4185'teki eski süreçler büyük olasılıkla bundan.) |
| B10 | Ekip krizi neredeyse hiç açılmıyor | `src/engine/sim.ts:506` | 20.000 oyunda 17 | Eşiği 90'a indirin ya da yüksek stresi daha olası yapın. |
| B11 | EMG-MED'de tam başarı %0,7; `treatCause`'un kaybı yüksek | `src/engine/events.ts:820-880` | Bölüm 6.7 | `treatCause` hastayı da dengelesin; kart daha erken açılsın. |
| B12 | Kontrast 3,69:1 ve 3,89:1; başlık sırası; yüzeyde h1 yok | `src/ui/styles.css:10` (`--faint`) | axe-core 4.10.2 | `--faint` rengini en az 4,5:1 kontrasta açın, başlık düzeylerini düzeltin. |
| B13 | Özet WebM dosyasında süre yok | `src/ui/screens/Recap.tsx` | İndirilen `.webm` → `duration` Infinity | Kayıt sonrası süreyi yazın (ör. EBML düzeltmesi) ya da MP4 kullanın. |
| B14 | Ölü i18n anahtarı `time.why` | `src/i18n/more2_tr.ts:60` (+ EN) | Hiçbir `.tsx` kullanmıyor | Silin. |

## 8. Sunum için öneriler

1. **Sunumdan önce B1'i çözün** (10 dakika). Açılış kartı "Güncel · canlı" demeli; konsolda kırmızı hata olmamalı. Olmazsa demoya başlamadan siteyi bir kez açıp önbelleği doldurmak işe yaramaz: önbellek de 3 saatten eski veriyi yeniliyor.
2. **İlk cümle problem olsun:** "Ay'da ya da Mars'ta oksijen, enerji, gıda ve radyasyon koruması aynı kütle, zaman ve insan için yarışır. Solbound öğrencinin bu bedeli yaşamasını ve nedenini görmesini sağlar." Sonra README'deki "Fit with the challenge" tablosunu tek slayt olarak gösterin.
3. **60 saniyelik demo akışı** (önceden hazırlanmış kayıtla):
   - **Kurulum:** seed **3034734154**, Mars, iniş **Gale Crater**. Bu seed'de 16. gün civarında **873 km/sn**'lik gerçek CME (`CME/49254`, 26 Ekim) gelir.
   - **Neden önceden hazırlık:** Arayüzde seed girilemiyor. Bu yüzden oyunu önceden 15. güne kadar oynayıp aynı tarayıcıda bırakın; "Göreve devam et" kaydı geri getirir.
   - **0–10 sn:** Kargo ekranında 520 kg barı (vücut kütlesi dahil). "Her kilo bir seçim."
   - **10–25 sn:** Geri sayım bandı ve Plan sekmesi (toz fırtınası). Bir hazırlık görevi başlatın.
   - **25–45 sn:** CME kartı açılır. Üç satırı okuyun: gerçek kayıt, NASA modeli, oyun kuralı. "Bu Güneş patlaması 26 Ekim'de gerçekten oldu."
   - **45–60 sn:** "Eve dön" → kontrol listesi (yiyecek, O₂, su, batarya) → 13:00 penceresi → özet: "Sistemlerin öğrettikleri" ve film.
   - **Uyarı:** CME'nin oyundaki günü, kalkış anındaki DONKI dosyasına bağlı. B1 düzeltilip veri yenilenirse olaylar değişir. Kaydı yeni veriyle hazırlayın.
4. **Ekip krizi kartını ve "Tahminin ötesinde" derecesini canlı göstermeye çalışmayın.** Kriz neredeyse hiç açılmıyor. "Ötesinde" derecesi tahmine kadar kalmayı gerektiriyor; 16× hızda bile 30 günlük oyun yaklaşık 3 dakika sürdü (g2: 191 sn, 44 karar). Ekran görüntüsüyle gösterin.
5. **Soruya hazır olun: "NASA verisi oyunu değiştiriyor mu?"** Dürüst cevap: "Şu an olayların zamanını, hızını ve anlatısını belirliyor. Sonuç oranları verili ve verisiz aynı. Sıradaki adımımız hızlı CME'lerin daha tehlikeli olması." Ayrıca videonun sonundaki "Powered by AI" ibaresinin ne anlama geldiğini (kod mu, görseller mi) bir cümleyle açıklamaya hazır olun.
