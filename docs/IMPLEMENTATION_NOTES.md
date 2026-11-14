# Uygulama notları — ilk oynanabilir dilim (V2-01)

Tarih: 14 Kasım 2026. Bu dosya [IMPLEMENTATION_PLAN_V2.md](IMPLEMENTATION_PLAN_V2.md) kapsamındaki ilk teslimatın kısa planı, alınan mühendislik kararları ve oyun varsayımlarıdır. Durum ve test sonuçları en alttaki "Durum" bölümünde tutulur.

## Repo incelemesi

- Başlangıçta repoda yalnız tasarım belgeleri, `PROMPT.txt`, `README.md` ve MIT `LICENSE` vardı; uygulama iskeleti, paket dosyası veya test yoktu. Bütün dosyalar korunur.
- v0.2 belgeleri (00_START_HERE → IMPLEMENTATION_PLAN_V2) esas alınır. v0.1'deki 12-sol / yalnız Mars / tur onayı kapsamı uygulanmaz.

## Plan (sıra)

1. **Temel:** Vite + React + TypeScript; yerel paketlenmiş yazı tipleri; EN/TR sözlükleri; `.gitignore`.
2. **Saf motor (`src/engine`)**: seed'li PRNG akışları, karakter/aday üretimi, 100V kargo doğrulaması, Ay/Mars senaryo tanımları, saatlik sabit adımlı simülasyon, olay kuyruğu, `resolveDecision`, kayıt doğrulama, sonuç hesabı. React, saat veya tarayıcı API'si içermez.
3. **Motor testleri (Vitest)**: determinizm, 3 kişi ve 100V sınırı, çift karar engeli, zaman eşiği, güç/su muhasebesi, kayıt/PRNG devamı, Ay/Mars ayrımı, deterministik politika fixture'ları (iyi / zorlu / başarısız).
4. **Arayüz**: önce bir hedef için hazırlıktan sonuca uçtan uca akış, ardından ikinci hedef ve kalan olaylar.
5. **Doğrulama**: typecheck, testler, production build, mümkünse Playwright ile masaüstü/mobil uçtan uca oynanış ve ekran görüntüsü incelemesi.

## Mimari kararlar

| Karar | Neden |
| --- | --- |
| Motor tek bir saf `applyCommand(state, command, content)` fonksiyonu | UI, saat adaptörü ve gelecekteki LLM aynı doğrulanmış komut kapısından geçer; test edilebilir |
| Rastgelelik `hash(seed, akışAdı)` ile türetilen ayrı akışlar | Karakter, aday ve sonuç çekilişleri birbirini etkilemez; render/önizleme zar atmaz |
| Sonuç zarı `hash(seed, olayÖrneğiId, seçenekId)` | Çekiliş karar kimliğine bağlıdır; sıra değişse de aynı karar aynı sonucu verir; P1 "başka karar" karşılaştırmasına hazır |
| Sabit adım = 1 görev saati; artık dakika saklanır | Düşük FPS fazla/az kaynak üretmez; büyük delta olayları atlayamaz (olay eşiğinde durur) |
| Olay örnek kimlikleri `çözülmüş` kümesinde | Aynı olay ikinci kez açılmaz/çözülmez |
| Günlük kayıtları `{anahtar, parametreler}` | Dil değişince geçmiş günlük de çevrilir; oyun durumu değişmez |
| Sürümlü `localStorage` kaydı + şema kontrolü | Yenileme ve dil değişimi oyunu sıfırlamaz; bozuk kayıt çökertmez |
| Saat adaptörü `requestAnimationFrame` + `visibilitychange` | Gizli sekmede zaman ilerlemez; kayıt yüklenince geçen gerçek süre eklenmez |
| SVG/CSS ile kodla üretilen bütün görseller | Harici varlık lisansı gerekmez; portreler seed'den tutarlı üretilir |

## Oyun varsayımları (kaynaklı değildir)

- **Zaman:** 1× hızda 60 aktif gerçek saniye = 1 görev günü; 2× ve 4× hız. Karar ve araştırma açıkken saat durur ve bu ekranda yazar.
- **Demo:** Her hedefte 3 yüzey günü (tam ürün hedefi 30 gün). Gidiş ve dönüş sıkıştırılmış ayrı bölümlerdir; gerçek uçuş süresi iddia edilmez.
- **100V:** soyut yük alanı; kütle modellenmez.
- **Kaynak katsayıları** (güç yükleri, panel üretimi, batarya kapasitesi, tüketim, sağlık kaybı, olasılık formülü) dengelenmek üzere seçilmiş oyun parametreleridir ve arayüzde "oyun varsayımı" etiketiyle gösterilir.
- **Ay demo konumu:** uzun aydınlanma alan bir kutup bölgesi varsayılır; 3 günlük demo Ay gündüzünde geçer. Ay gecesi tam kampanya içeriğidir.
- **Sağlık / stres / radyasyon** boyutsuz eğitim endeksleridir; tıbbi doz veya sağkalım tahmini değildir.
- **Keşif modu:** sağlık sıfıra düştüğünde kişi "acil tahliye" ile eve gönderilir (görev ekibinden çıkar, kayıp sayılmaz ama tam başarı da sayılmaz). Normal modda aynı kural zinciri saygılı bir görev kaydıyla "kayıp" olarak anlatılır. Bu, belgedeki öneriye göre uygulanmış bir varsayımdır.
- **Boy/kilo** yalnız profil bilgisidir; şansı etkilemez. Deneyim stres artışını, motivasyon ekip uyumunu biraz etkiler (açıklamalı).

## Kapsam dışı (bu teslimatta)

30 günlük içerik, "başka bir karar" karşılaştırması (P1; veri modeli hazır), runtime LLM, backend, ses, sınıf paneli.

## Durum (14 Kasım 2026)

### Oynanabilir kapsam

- **Hazırlık:** EN/TR ilk seçim (cihazda saklanır, sonradan değiştirilebilir) → seed'li astronot (3 yetenek, özel eğitim, geçmiş, boy/kilo/yaş/deneyim/motivasyon; isim isteğe bağlı) → Normal/Keşif modu → Ay/Mars → 12 aday arasından tam 3 arkadaş (isim değiştirilebilir, ayrıntılar hover/tık/odakla) → 100V kargo (13 eşya, 10×10 görsel ızgara, hedefe uyumsuz eşya kalkışı gerekçeyle engeller) → brifing ve kalkış.
- **Gidiş:** sıkıştırılmış yolculuk sahnesi + OUT-01 (dört seçenek; pilot eğitimi ayrı seçenek açar). Kararın sonucu iniş durumunu değiştirir (gizli pompa arızası / ek batarya).
- **Yüzey (her hedefte 3 demo günü):** canlı SVG üs (gece/gündüz, toz, panel kiri, batarya doluluğu, sera ışığı ve bitki boyu, fan, sızıntı, SPE sığınağı, görevdeki astronotlar), görünür saat ve duraklama nedeni, 1×/2×/4× hız, kaynak şeridi ve "Neden?" akış dökümü, güç öncelik listesi, sera modu, ekip rutinleri, günlük, araştırma kartları.
  - Ay: MOON-01, MOON-S1, MOON-02, MOON-S2, MOON-03 (3 ana + 2 küçük). Mars: MARS-01, MARS-S1, MARS-02, MARS-S2, MARS-03.
  - Acil durumlar (EMG-O2, EMG-MED) yalnız günlükte uyarı göründükten sonra açılır ve müdahale seçeneği sunar.
- **Dönüş:** RETURN-01 rezerv kontrol listesi (yiyecek, O₂, su, batarya, komutan), bir günlük erteleme veya eksik rezervle kısıtlı dönüş; RETURN-02 yardımcı devre arızası (yedek parça / elle onarım / ayrılan payla yedek hat / güç kısma).
- **Sonuç:** başarı / kısmi / erken bitiş / kayıp; neden tam başarı olmadığı, üç kilit karar ve şansları, hazırlığın yankısı, sistem dersleri, tam günlük, aynı seed ile tekrar.

### Hazırlığın gerçek etkisi (örnekler)

Eşyalar ve eğitimler seçenekleri açar veya şansı değiştirir ve bu, olay kartında "Bunu mümkün kılan" ve günlükte ✦ ile gösterilir: sızdırmazlık kiti (MOON-02 yama), yedek parça (MOON-02, RETURN-02, EMG-O2 bonusu), filtre (MARS-01), tohum kiti (MARS-03), moral paketi (MOON-S2, MARS-S2), spektrometre/jeolog (MOON-S1, MARS-S1), uzay havası analisti (MOON-03 erken uyarı), sağlık görevlisi (EMG-MED), pilot (OUT-01), oksijen mumu (EMG-O2). Batarya modülü, gıda paketi, koruyucu paneller, CO₂→O₂ ünitesi pasif etkilidir. R-SPE ve R-BATTERY araştırmaları birer seçenek açar.

### Doğrulama (bu oturumda gerçekten çalıştırıldı)

| Kontrol | Sonuç |
| --- | --- |
| `npm run typecheck` (TypeScript 7.0.2) | Hatasız |
| `npm test` (Vitest 5.1) | 28/28 geçti: determinizm, 12 aday/eğitim kapsaması, yetenek bütçesi, isim/ID, 3 kişi sınırı, 100V sınırları, uyumsuz eşya, kalkış kilidi, tek seferlik karar, commit anında zar, ekip doğrulaması, uzun görev zamanlaması, kilit nedenleri, araştırma kilidi, olay eşiğinde durma, duraklama, kare boyutundan bağımsızlık, elektroliz/su muhasebesi, negatif stok yerine açık, Ay/Mars ayrımı, kayıt gidiş-dönüş, bozuk kayıt, üç politika fixture'ı (başarı / kısmi / uyarılı kayıp ve keşif modunda tahliye) + denge raporu |
| `npm run build` (Vite 8.3) | Başarılı; JS ≈ 457 kB (gzip ≈ 141 kB) |
| `npm run e2e` (Playwright, Chromium headless) | 38/38 geçti: Mars/TR 1440×900 ve Ay/EN 390×844 baştan sona oynandı; yatay taşma yok; boş isim → atanmış isim; HTML içeren isim düz metin; geri dönüşte yetenek sabit; 4. arkadaş engelli; çift tıklamalı kalkış tek görev; karar duraklaması görünür; gizli sekmede saat durur ve geri gelince devam eder; açık olayda dil değişimi metni çevirir; yenilemeden sonra aynı açık olaya dönülür; araştırma saati durdurur; konsol hatası yok |

E2E ekran görüntüleri `e2e-screens/` klasörüne yazılır (git'e girmez). İncelenen ekranlar: açılış, kimlik, hedef, ekip, kargo, yolculuk kararı, sonuç kartı, yüzey, olay kartı, günlük, araştırma, dönüş kontrol listesi, iniş (mobil), sonuç (masaüstü ve mobil). İnceleme sırasında bulunan gerçek sorunlar düzeltildi: rozet sınıfı ile ekran sınıfının çakışması (yolculuk kartı bozuktu), boş isim alanı, mobil HUD yüksekliği, kargo "kendiliğinden çalışır" yanlış etiketi, parametresiz acil durum başlığı, kısmi başarının açıklanmaması.

### Kaynak doğrulaması

Araştırma kartlarındaki iddialar 14 Kasım 2026'da şu sayfalar açılarak kontrol edildi: NASA ECLSS, ISS su geri kazanımı (%98 kilometre taşı), Mars toz fırtınaları, NASA Science Ay gerçekleri (127 °C / −173 °C, ekzosfer, toz), NASA OCHMO radyasyon koruma özeti (PDF metni çıkarıldı: erken uyarı, su kaplarıyla sığınak, Ay yüzeyi dış çalışma riski), NASA HRP "Distance From Earth" (tek yön 20 dakikaya kadar gecikme), NASA bitki araştırmacıları sayfası, Perseverance MOXIE (122 g, saatte ~12 g). Ay için ~1,3 sn gecikme sayfadan alıntı değil, uzaklık ÷ ışık hızı ile **türetilmiş** olarak etiketlendi. R-BATTERY kartı **türetilmiş** (enerjinin korunumu) olarak işaretlendi. Bütün oyun sayıları kartlarda ayrıca "oyun varsayımı" olarak listelenir.

### Denge gözlemleri (deterministik politika raporu, 3 seed)

- Özenli hazırlık + makul kararlar her iki hedefte de 3/3 seed'de tam başarı verdi.
- Boş kargo Mars'ta yiyecek açığı yüzünden kısmi başarıya gidiyor; Ay'da şansa ve ekibe göre kısmi/başarı arasında değişiyor. **Ay, Mars'tan belirgin biçimde kolay**; MOON-01 "her şeyi bataryayla çalıştır" seçeneğinin bedeli düşük kalıyor.
- Mars'ta toz fırtınası sonrası batarya çoğu zaman dönüş eşiğinin (20 kWh) altında kalıyor; "bir gün ertele" sık seçiliyor. Bu bilinçli bir ödünleşim ama öğrenci testinde izlenmeli.
- Kayıp yalnız uyarıların ve acil durum seçeneklerinin görmezden gelinmesiyle oluşuyor; 3 günlük demoda normal oynanışta nadir.

### Bilinen eksikler ve sonraki işler

1. **30 günlük kampanya içeriği** (30–60 olay, Ay gecesi, daha uzun gidiş/dönüş bölümleri) yazılmadı.
2. **"Başka bir karar" karşılaştırması (P1)** yapılmadı; zarlar karar kimliğine bağlı olduğundan altyapı hazır.
3. **Denge:** Ay zorluğu artırılmalı, Mars dönüş batarya eşiği öğrencilerle denenmeli; tek bir baskın eşya seti şu an görünmüyor ama tam analiz yapılmadı.
4. Ekran okuyucuyla manuel erişilebilirlik testi, Safari/Firefox ve gerçek mobil cihaz testi yapılmadı (yalnız Chromium headless).
5. Karakter konuşmaları olay başına tek satır; derin karakter ilişkileri P1.
6. Ses, sınıf paneli, runtime LLM ve backend kapsam dışı.
7. Commit, push ve dağıtım yapılmadı.

---

## v0.3 — `eksikler.md` ve `RESEARCH_INFERENCE.md` turu (14 Kasım 2026)

### `eksikler.md` maddeleri

| Madde | Yapılan |
| --- | --- |
| Karşılama arayüzü sade; dil ortada | Yeni açılış: üstte sabit gezinme çubuğu ve EN/TR (ilk ziyarette tarayıcı diline göre seçilir, ayrı dil ekranı yok), hareketli uzay panoraması (Dünya, Ay, Mars, yörüngede dolaşan özgün bir istasyon, uydu, iple bağlı süzülen astronot, kuyruklu yıldız, fareyle paralaks), özgün görev arması, “Hikâyeyi oku” ve “Nasıl oynanır?” pencereleri, kaynaklı “Biliyor muydun?” bilgi kartı, özellik kartları |
| NASA logosu ve nesneler | Uzay nesneleri eklendi. **NASA logosu kullanılmadı**: NASA amblemi izinsiz kullanılamaz ve onay izlenimi verir; proje zaten “resmî NASA ürünü değildir” diyor. Yerine özgün arma ve “halka açık NASA bilgileriyle hazırlandı, NASA ile bağlantılı değildir” notu var. Logo isteniyorsa takımın Space Apps kurallarını/izinlerini kontrol etmesi gerekir |
| Olaylar arası 20 sn bekleme | Ekip sohbetleri (49 durum/eğitim/hedefe bağlı diyalog; sahnede balon + günlük), hız 8× ve 16×, günde 2–3 olay |
| 100V yerine ağırlık; astronotlara kilo | Kütle bütçesi: 520 kg = dört kişinin vücut kütlesi + kişi başı 20 kg kişisel kit (kıyafet, giysi astarı, hijyen, alet, küçük parça) + ek yük. Aday kartlarında kilo, ekip özetinde kalan kg, kargoda yığın çubuk; azaltma her zaman serbest, aşımda kalkış engellenir. 520 ve 20 kg oyun değeridir (kullanıcı örneği 400 kg idi; dört kişi + kitlerle ek yüke yer kalsın diye 520 seçildi) |

### `RESEARCH_INFERENCE.md` özellikleri

F-01…F-16’nın tamamı oyunda (demo + P1 olarak işaretlenenler dahil): su–oksijen döngüsü kartı ve şeması (F-01), su saflığı olayı WQ (F-02), hidrojen kararı ve çalışan Sabatier reaktörü SAB (F-03), iki katmanlı toz (F-04), “gerçek mi kurgu mu” rüzgâr olayı WIND (F-05), dişliye giren toz GEAR (F-06), fırtınayı bekle seçeneği (F-07), Mars varış mevsimi seçimi ve kartı (F-08), LED/güneş ödünleşimi (F-09), ürün seçimi CROP: yeşillik/patates/soya (F-10), hasatta “gözlü patatesi yeniden ek” HARVEST (F-11), arıtılmış atık su ile besleme (F-12), Mars sera örtüsü kontrolü (F-13), perkloratlı tuzlu su BRINE + arıtıcı eşyası (F-14), kargo ekranında “her şeyi paketleyemezsin” (F-15), arama-kurtarma olayları MARS-SAR / MOON-SAR (F-16; neden rüzgâr değil, kuma gömülen tekerlek / krater gölgesi).

### Ay araştırması (yeni, 14 Kasım 2026’da açılıp okunan kaynaklar)

NASA Science Moon Dust (Apollo 17 tozu, “Ay saman nezlesi”, elektrostatik yük), Shackleton kraterinin aydınlık kenarı (kutupta Güneş ufukta kayar, kalıcı gölgeli bölgeler, buz düşüncesi), Shrinking Moon (sığ Ay depremleri, güney kutbu), Lunar Impact Monitoring (atmosfer yok, 20–72 km/s), NASA Glenn Fission Surface Power (14,5 günlük gece, 40 kW reaktör), NTRS 2024 ISRU sunumu (regolit kütlece %40’tan fazla oksijen; PDF metni çıkarılarak doğrulandı). Mars için NASA Mars Facts (24,6 sa sol, 687 gün yıl, ince CO₂ atmosferi, küresel manyetik alan yok, ~20 °C / −153 °C). CROPS sayfasındaki CR-01, CR-03 (yumru) ve CR-05 satırları sayfadan doğrulandı.

### Yeni oynanış

- **Demo 7 yüzey günü.** Her görev seed’den bir program kurar: her hedefte 4 zorunlu hikâye anı + ağırlıklı havuzdan çekilen olaylar; her gün en az bir olay, bazı günler akşam olayı. Aynı seed aynı program, farklı seed farklı birleşim (test edildi).
- **İniş yeri / mevsim:** Ay kutup sırtı (kararlı alçak güneş, ICE ve SHADOW olayları) ya da yakın yüz ekvatoru (öğleye doğru artan güç ve ısı, HEAT olayı); Mars kuzey baharı (daha az güneş, küçük fırtına, toz hortumu) ya da güney yazı (daha çok güneş, 60 saatlik büyük fırtına).
- **17 yeni olay:** CROP, HARVEST, WQ, SAB, WIND, GEAR, BRINE, MARS-SAR, DEVIL, QUAKE, MICRO, HAYFEVER, MOON-SAR, ISRU, ICE, SHADOW, HEAT; MARS-02’ye “fırtınayı bekle”, MARS-03’e “LED güçlendir”.
- **ⓘ sözlük:** 39 terim (elektroliz, Sabatier, perklorat, regolit, kalıcı gölgeli bölge, mikrometeoroit…). Metinlerde `[[terim|görünen]]` işaretiyle; fareyle üzerine gelince, odaklanınca veya dokununca açılır; kart kenarlarında kırpılmasın diye `position: fixed`.
- **Araştırma kartları 9 → 23.** Hepsi kaynaklı/türetilmiş/oyun varsayımı etiketli; R-LOOP kartında döngü şeması.
- Sabatier suyu (üretilen kg O₂ başına ~0,56 kg) mol kütlelerinden **türetilmiştir**; bütün sayısal etkiler oyun değeridir.

### Doğrulama (bu turda çalıştırıldı)

| Kontrol | Sonuç |
| --- | --- |
| `npm run typecheck` | Hatasız |
| `npm test` | 37/37 (yeni: kütle bütçesi, program determinizmi ve çeşitliliği, site olayları, her olay/sohbet için EN+TR metin varlığı, Sabatier oranı, hasat kararı, kurtarma olayında “uzaktaki” ekip, sohbetin kaynakları değiştirmemesi) |
| `npm run build` | Başarılı; JS ≈ 594 kB (gzip ≈ 182 kB). Vite 500 kB üstü parça uyarısı veriyor; kod bölme yapılmadı |
| `npm run e2e` | 46/46: Mars/TR/güney yazı 1440×900 ve Ay/EN/ekvator 390×844 baştan sona 16× hızla oynandı; dil düğmesi üstte; hikâye penceresi; iniş yeri seçimi; ⓘ fareyle açılıyor; kg bütçesi; gizli sekmede saat durur; dil değişimi/yenileme; araştırma duraklatır; ≥5 sohbet satırı; konsol hatası yok |

Denge raporu (3 seed × 6 politika): özenli planlar hem Ay (iki bölge) hem Mars (iki mevsim) için büyük çoğunlukla tam başarı; boş kargo kısmi başarı (yiyecek/su/batarya eksiği). Mars güney yazında “fırtınayı bekle” bataryayı belirgin biçimde korur. Kayıp yine yalnız uyarıları görmezden gelince oluşur.

### Bilinen eksikler

1. 30 günlük kampanya içeriği ve Ay gecesi yok.
2. “Başka bir karar” karşılaştırması (P1) yok.
3. Mars güney yazı fırtınasında olay havuzu daha küçük; bazı yarım günler yalnız sohbetle geçer.
4. Kod bölme yapılmadı (tek JS paketi ≈ 594 kB).
5. Safari/Firefox, gerçek cihaz ve ekran okuyucu testi yapılmadı.
6. Commit/push/dağıtım yapılmadı.

## v0.4 — 30 günlük görev, geri sayımlar, özet filmi (14 Kasım 2026)

### İstenenler ve yapılanlar

| İstek | Yapılan |
| --- | --- |
| CLAUDE.md’deki eski dosya adları | `PROMPT.txt` → `docs/BRAINSTORM.md`, `docs/MAIN.txt` → `docs/MAIN.md`; 100V / 3 günlük demo ifadeleri de güncel kapsama (520 kg kütle bütçesi, 30 gün) çevrildi |
| Hata 1: aday kartında fareyle ayrıntı açılıyor | Hover/odak ile açılma kaldırıldı; ayrıntı yalnız “Ayrıntılar” düğmesiyle açılıp kapanır, kartlar birbirinden bağımsız (aynı anda 2–3 kişi kıyaslanabilir), ayrıca “Tüm ayrıntıları göster/gizle” düğmesi |
| Hata 2: habitat 3 kişilik, 4. kişi dışarıda | Habitatta 4 pencere; her kişi kendi penceresinde (gece e2e testi x=475,505,535,565 doğruluyor). Uçuş ekranında “Gemide” satırında dört kişi |
| 4–5 yeni karakter | 16 aday; 5 yeni uzmanlık: haberleşme subayı (uyarılar 1 gün erken, Mars’ta Dünya desteği), enerji mühendisi (şarj verimi, panel/direk/radyatör hazırlıkları), ISRU kimyageri (Sabatier, tuzlu su, kayadan O₂), beslenme uzmanı (%8 az tüketim, %10 fazla hasat), gezici sürücüsü (kurtarma, kargo, set) + 6 yeni geçmiş |
| Demoyu kaldır, 30 güne tamamla | Yüzey görevi 30 gün. Program 30 güne yayılır; tekrar edebilen rutin olaylar ayrı örnek kimliği alır (zar örneğe bağlı). Ekvatorda gerçek Ay günü/gecesi döngüsü (gün batımı ≈ 15. gün, gün doğumu ≈ 29. gün), kutupta sabit alçak güneş. Başlangıç kileri ve su tankları büyütüldü (oyun değeri). Su acil durumu eklendi (O₂’deki gibi önce uyarı, sonra karar) |
| Rastgele isimler ve görseller | Dil/bölge gruplu isim üreticisi (18 grup, 1500+ birleşim, ekipte aynı ad/soyad yok); oyuncu adı dile göre. Portre: 12 ten, 14 saç rengi, 10 saç modeli (afro, at kuyruğu, örgü, başörtüsü dahil), sakal/bıyık, kulaklık, küpe, gözlük çeşidi, göz rengi, takım arması |
| Büyük olaylar için geri sayım ve hazırlık | Önceden bilinebilen olaylar: Mars toz fırtınası (yörünge hava haritası, 3 gün; güney yazında 2 fırtına), Ay ekvator gecesi (5 gün), meteor yağmuru (5 gün), kutup karanlık dönemi (4 gün), kargo modülü (5 gün). Tahmin kartı → üst barda geri sayım çipleri → “Plan” sekmesinde ekip zamanı ve kaynak harcayan hazırlık görevleri → olay geldiğinde hazırlığa göre değişen kart. Güneş parçacık olayı ve depremler önceden bilinemediği için sürpriz kalır |
| Uzaydaki zaman + Dünya’daki eşdeğeri | Üst barda “Dünya’da geçen” süre. Mars’ta üs saati Mars saatiyle işler (Sol N, 1 sol = 24 sa 39 dk 35 sn), Mars saatinin Dünya’nın kaç dakika gerisinde kaldığı, sinyal gecikmesi (4–21 dk). Ay’da Ay saatlerinin µs farkı (günde 58,7 µs), 1,3 sn gecikme, ekvatorda gün batımı/doğumuna kalan süre. “Neden iki saat?” açıklaması ve R-TIME kartı |
| Hız düğmelerinin başına “Hız” | Eklendi (masaüstü ve mobil) |
| Bitiş videosu / gif, paylaşılabilir | Değerlendirme ekranında ~27 sn’lik “Görev filmi” (canvas): başlık, ekip, yolculuk, 30 günün kaynak grafiği ve büyük olay işaretleri, önemli kararlar, rakamlar, sonuç. “Videoyu kaydet” (MediaRecorder ile WebM; destekleyen tarayıcıda MP4), “Görsel kartı kaydet” (PNG), “Paylaş” (Web Share; yoksa metni kopyalar), “Özet metnini kopyala”. GIF değil video seçildi: tarayıcı yerleşik kaydı kullanır, ek kütüphane gerekmez |

### Kaynaklar (14 Kasım 2026’da açılıp okundu)

- NASA, *Lunar Time*: Ay’daki gözlemciye Dünya saati günde ortalama 58,7 µs geri kalıyor görünür.
- NASA GISS, *Mars24 Technical Notes*: ortalama sol 24 sa 39 dk 35,244 sn (arama sonucunda doğrulandı).
- NASA, *“Storm Chasers” on Mars*: MARCI her gün bütün gezegeni haritalıyor; fırtına ilk görünüşünden büyüyüşüne kadar izlenebiliyor.
- NASA MEO, *About Lunar Impact Monitoring*: meteor yağmurlarında oran arka planı “çok aşabilir”; NTRS 2010 Geminid raporu (bir gecede saatte ~4 çarpma, yılın geri kalanında ~6 saatte 1).
- NASA/JPL MGS SSS: tek yönlü ışık süresi 4–21 dk.
- Fisyon ünitesinin 5 kW gücü, radyatör tozu kaybı, uyarı süreleri, kargo içeriği **oyun değeridir** ve kartlarda öyle etiketlidir.

### Denge (deterministik politika raporu, 3 seed)

- Hazırlık yapan özenli planlar: Ay kutup, Ay ekvator, Mars bahar, Mars yaz → 12/12 tam başarı.
- Ekvatorda hazırlıksız gece (yalıtım/radyatör yok, sera kapalı): 1 başarı, 2 kısmi (yiyecek/su kıtlığı).
- Kargo boş ama mantıklı kararlar (Mars): kısmi (yiyecek eksik). Kargo boş ve özensiz (fırtınada tam güç, uyarıları yok sayma): kayıp.

### Doğrulama (bu turda çalıştırıldı)

| Kontrol | Sonuç |
| --- | --- |
| `npm run typecheck` | Hatasız |
| `npm test` | 46/46 (yeni: 16 aday/15 uzmanlık, isim çeşitliliği, 30 güne yayılan program ve tekrar kimlikleri, site/mevsime göre büyük olaylar, haberleşme subayının erken uyarısı, hazırlık görevinin yalnız geri sayımda ve bir kez yapılabilmesi, Ay gecesi ve radyatör, günlük geçmiş, Mars/Ay saat farkı, su acil durumu) |
| `npm run build` | Başarılı; tek JS paketi 500 kB üstü uyarısı (kod bölme yok) |
| `npm run e2e` | 71/71: Mars/TR/güney yazı 1440×900 ve Ay/EN/ekvator 390×844, 16× hızla 30 gün baştan sona. Yeni kontroller: 16 aday, hover ayrıntı açmıyor, 3 kart aynı anda açık, gece dört kişi habitat pencerelerinde, “Hız” etiketi, Dünya saati, Sol/Gün N / 30, tahmin kartında geri sayım, üst bar çipleri, hazırlık görevi başlatma, özet filmi çiziliyor, PNG ve WebM iniyor, konsol hatası yok |

### Bilinen eksikler

1. “Başka bir karar verseydin?” karşılaştırması yok.
2. Video WebM olarak kaydediliyor (Chromium’da test edildi); Safari’de MP4 yolu ve Web Share dosya paylaşımı test edilmedi. GIF çıktısı yok.
3. Olay havuzu 30 güne yayıldı ama bazı günler yalnız sohbet ve rutinle geçiyor; bir sonraki adım görev/kombinasyon artırmak.
4. Kod bölme yok (tek JS paketi 500 kB üstü).
5. Safari/Firefox, gerçek cihaz ve ekran okuyucu testi yapılmadı.
6. Commit/push/dağıtım yapılmadı.

## v0.5 — Canlı NASA verisi: DONKI ve gerçek sinyal gecikmesi (14 Kasım 2026)

Mentör isteği: halka açık bir NASA API’sinden beslenen, kendini yenileyen bir özellik.

### Uç nokta denemeleri (14 Kasım 2026, gerçekten çağrıldı)

| Uç nokta | Sonuç |
| --- | --- |
| `api.nasa.gov/DONKI/CME` | 200, CORS `*`; 30 günde 86 CME. WSA-ENLIL sonuçlarında Mars için 15, Dünya için 3 varış tahmini |
| `…/GST`, `…/IPS`, `…/SEP`, `…/notifications` | 200 (SEP son 30 günde boş) |
| `…/FLR` | 404 (NASA tarafında). Kod bunu tolere ediyor, liste geri gelince otomatik kullanılır |
| `kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get/*` | Yanıt yok (zaman aşımı); kullanılmadı |
| JPL Horizons API | 200 ama CORS başlığı yok, tarayıcıdan çağrılamaz. Yalnız formülü doğrulamak için kullanıldı |

### Yapılanlar

- `src/live/donki.ts`: son 30 günü indirir (CME, FLR, SEP, GST, IPS), normalize eder, her uç nokta bağımsız hata verebilir. `useSpaceWeather`: tarayıcıda önbellek, 30 dakikada bir yenileme, ulaşılamazsa kayıtlı kopya, o da yoksa oyunla gelen örnek (`donki-fallback.json`, 14 Kasım 2026 verisi; `npm run donki:snapshot` ile yenilenir).
- Açılış ekranında “Canlı uzay havası” kartı: durum, veri penceresi, indirme ve son kontrol zamanı, kaynak (canlı / kayıtlı kopya / oyunla gelen), sayılar, bugünkü Dünya–Mars uzaklığı ve sinyal süresi, “kayıt yok ≠ güvenli” notu.
- Brifingde anlık görüntü göreve eklenir (`setSpaceWeather`) ve kalkışta donar. Motor ağa çıkmaz; aynı seed + aynı veri = aynı görev (test edildi).
- Eşleme: görevin 1. günü = veri penceresinin ilk günü, 1 gerçek gün = 1 görev günü (oyun eşlemesi, kartta yazıyor).
- Gerçek CME varışları (Mars’ta Mars tahmini, Ay’da Dünya tahmini) en fazla 3 geri sayımlı olaya dönüşür. Geri sayım, CME’nin gerçekte gözlendiği anda başlar ve modelin varış saatinde biter. Hazırlık: su torbası duvarı, EVA planı, oksijen stoku. Olay kartında NASA kaydının bağlantısı var. Etkisi oyun kuralıdır, doz iddiası yoktur.
- Diğer kayıtlar (bize yönelen ya da hızlı CME’ler, M/X patlamaları, jeomanyetik fırtınalar, şoklar, SEP) gerçek günlerinde “📡 NASA DONKI” bülteni olarak günlüğe ve Plan sekmesine düşer. Ay’da gerçek bir SEP varsa rastgele parçacık olayının zamanı onunla değiştirilir.
- Sinyal gecikmesi: JPL “Approximate Positions of the Planets” Tablo 1 ile Dünya–Mars uzaklığı, görevin gerçek tarihine göre. Horizons’a karşı hata ≤ %0,02 (≤ 0,1 sn ışık süresi), 8 tarihte test ediliyor. Veri yoksa eski seed değeri kullanılır.
- API anahtarı `.env` içinde (`NASA_API_KEY`); `.env` artık `.gitignore`da ve `.env.example` eklendi. Vite `envPrefix: NASA_` ile anahtar tarayıcı paketine girer. Yayımlanırsa herkes görebilir; bu yüzden yalnız ücretsiz api.nasa.gov anahtarı kullanılmalı.

### Doğrulama

| Kontrol | Sonuç |
| --- | --- |
| `npm run typecheck` | Hatasız |
| `npm test` | 51/51 (yeni: Horizons’a karşı formül, DONKI normalizasyonu, CME geri sayımlarının kuralları, veri donması ve determinizm, bültenlerin teslimi, gerçek tarihe göre sinyal gecikmesi) |
| `npm run build` | Başarılı (JS ≈ 737 kB; 500 kB uyarısı) |

## v0.6 — `eksikler.md` turu: seçimler, zorluk, takviye ekip, görseller, optimizasyon (14 Kasım 2026)

Ayrıntılı madde madde durum: kökteki `eksikler.md`. Güncel kapsamın tek özeti: `docs/CURRENT_STATE.md`.

- **İsim ve avatar:** `Character.gender`; isimler oyun diline göre (TR/EN havuzları cinsiyetli). Portre saç modeli, sakal ve küpe cinsiyete göre seçiliyor; palet sakinleştirildi; yaş 44 üstünde kır saç. Hazırlıkta dil değişince `localizeNames` otomatik isimleri yeni dile çeviriyor.
- **Seçenekler:** 21 olaya açık seçenek eklendi. Test: kit, rol ya da araştırma gerektirmeyen en az 3 seçenek, toplam en fazla 6. Tahmin kartlarında “ekip brifingi”.
- **Zorluk:** başarı tabanı ×0,85 (`DIFFICULTY`), görev yorgunluğu ×1,4 (`FATIGUE_COST`), görev saatleri ×1,5 (içerik ve metinler birlikte güncellendi). Dışarıdaki kişi-saat başına 0,06 kg O₂, 0,3 L su, 0,25 kWh (oyun değerleri). Ölçüm: rastgele seçim yapan bir “oyuncu” 24 görevin 8’ini kaybediyor; eski zorlukta da 11’ini kaybediyordu. Kayıplar zorluktan çok riskli seçimlerden geliyor.
- **Hasat çeşitliliği:** HARVEST, HARVEST-MOLD (kaynak: NASA zinnia küfü), HARVEST-FEAST ve HARVEST-SEEDS seed’e göre dönüşümlü geliyor. Çift hasat hatası düzeltildi.
- **Takviye ekip (yalnız Ay):** iki canlı görüşmeden sonra REINF-OFFER çıkıyor (kabul / kargo / ret). Kabulde geri sayım ve hazırlık (zemin, enerji hattı) başlıyor. REINF ile iki aday katılıyor. Modül habitatın üstünde bir kat: kendi O₂ üreticisi (0,06 kg/sa), 0,5 kW yaşam desteği, 0,6 (0,3) kW ısı ve 1,2 kW panel. Kurulmazsa sıkışma ya da vardiya. Mars’ta yok (gerekçe R-REINF kartında).
- **Görseller:** panoramada gezegen ayrıntıları; üs sahnesinde arazi katmanı (memo), gölgeler, gece ışıkları, Dünya ayrıntısı ve takviye katı. Olay kartı sahnenin yanında duruyor ve ilgili modül vurgulanıyor. Aktarma ekranında 7 sn’lik seyir, paralaks ve ilerleme göstergesi var.
- **NASA verisi:** “Kısmen güncel” durumu; alınamayan listeler “—” gösteriliyor; CME kartında gerçek kayıt / model / oyun etkisi satırları; kesin ifadeler yumuşatıldı.
- **Optimizasyon:** ekranlar ayrı parçalara bölündü, TR sözlüğü tembel yükleniyor (ilk yük ≈ 737 → 513 kB); kayıt 3 sn’de bir; uzay havası anlık görüntüsü klonlanmıyor.
- **Belgeler:** `docs/CURRENT_STATE.md` eklendi; `00_START_HERE`, README ve CLAUDE.md ona yönlendiriyor.
- Kayıt şeması 5, içerik `0.6.0-choices` (eski kayıtlar sürüm uyarısıyla açılmaz).

### v0.6 doğrulama

| Kontrol | Sonuç |
| --- | --- |
| `npm run typecheck` | Hatasız |
| `npm test` | 56/56. Yeni testler: cinsiyetle eşleşen ve dile göre değişen isimler; dil değişiminde yalnız otomatik isimlerin değişmesi; her kartta en az 3 açık seçenek ve en fazla 6 toplam; hasat dönüşümü; Ay takviye ekibi (Mars’ta yok); zorluk ve giysi tüketimi |
| `npm run build` | Başarılı. Parçalar: açılış ≈ 513 kB (index 213 + Title 300), TR sözlüğü 140 kB (tembel), Mission 68, Prep 23, Debrief 17 kB. 500 kB uyarısı yok |
| `npm run e2e` | 80/80: Mars/TR masaüstü (canlı NASA, kısmen güncel) ve Ay/EN mobil (NASA engelli). Yeni kontroller: Türkçe ekip isimleri, “—” gösterimi, araştırma ve dil değişiminde tembel yükleme. Test rastgele seçim yaptığı için sonuçlar “Evdeyiz, ama bedeli oldu” ve “Mission lost” çıktı |

## v0.7 — tahmini kalış, “Eve dön”, V3 test düzeltmeleri (14 Kasım 2026)

Ayrıntılı madde listesi `eksikler.md` dosyasında; güncel özet `docs/CURRENT_STATE.md`’de. Kayıt şeması 6, içerik `0.7.0-goal`.

- **Hedef:**
  - `estimateStay(run)` olaysız bir sessiz çalıştırmayla tahmin üretiyor. Her gün 12:00’de dönüş rezervlerine bakıyor; çalışma başına yaklaşık 4 ms.
  - `MissionState.goal = { estimate, target, limiting }`, hedef `GOAL_SHARE` (0,85) ile hesaplanıyor.
  - `outcome`: hedefe ulaşmadan dönen görev `partial` sayılıyor ve `reason.early` ekleniyor.
- **`returnHome` komutu:** `endSurface` erken çağrılıyor. `endSurface` artık gerçek gün sayısını kaydediyor ve `surfaceEndMinute` (son gün 14:00) kullanıyor.
- **V3 düzeltmeleri:**
  - `gh` efekti önceki modu `ghBefore` olarak saklıyor; fırtına, gölge ve gece bitince sera o moda dönüyor.
  - Dönüş öncesi batarya uyarısı.
  - Ortak acil durum yedeği (`contingencyUsed`); tıbbi kartlar 12 saatte bir.
  - RETURN-01 bekleme seçeneği gerçekten şarj ediyor; RETURN-02 yedek hat kontrollü.
  - Yeni olaylar SETUP, FINAL-EVA ve PACK.
  - Ekip uyumu (cohesion) ve uzmanlık etkileri.
  - Eşya dengesi: gıda 10 kişi-gün, MOXIE 24 kg ve su tasarrufu, kalkan 32 kg, batarya +30/25 kWh.
  - Mars’ın başlangıç suyu 340 L.
- **Tahminler engellemiyor:** kuyruktaki `FC-*` artık kart açmıyor; `forecast` tonunda günlük satırı ve arayüzde bant olarak çıkıyor.
- **Arayüz:**
  - Sahne sabit boyutta; olay kartı sahnenin altında ve geniş ekranda iki sütunlu, yeni kart açılınca otomatik kaydırma.
  - Aday ekranı sayfalı (3 × 2 / 2 × 2).
  - “Eve dön” penceresi, hedef çipi, brifing ve yük ekranında tahmin kartı.
  - Varsayılan hız 2×.
- **NASA anahtarı:**
  - `envPrefix` içinden `NASA_` çıkarıldı; `dist/` içinde anahtar yok (aranarak doğrulandı).
  - `public/donki-latest.json` (`npm run donki:snapshot`) ve `.github/workflows/donki-snapshot.yml` eklendi; tarayıcı yalnız `DEMO_KEY` kullanıyor (sınırı IP başına; başlıkta saatte 10 istek olarak ölçüldü). Yenileme aralığı 3 saat.
- **Denge raporu:** `realistic()` + `playLaunched()` ile 8 seed, rastgele ekip ve gerçek kütle. Özenli politikayla tam başarı: Ay kutup 6/8, Ay ekvator 4/8, Mars bahar 6/8, Mars yaz 5/8.
- **Takviye ekip:** iniş en erken 20. gün 10:00 (kullanıcı isteği), teklif 24. güne kadar; `scheduleBig.notBeforeDay`.

### v0.7 doğrulama

| Kontrol | Sonuç |
| --- | --- |
| `npm run typecheck` | Hatasız |
| `npm test` | 61/61. Yeni testler: tahmin (deterministik, gıda tahmini uzatır, hedef %85), “Eve dön” ile erken dönüşün kısmi başarı sayılması, seranın önceki moda dönmesi, yedeğin görev başına bir kez kullanılması, takviye ekibin 20. günden önce inmemesi, gerçekçi denge raporu |
| `npm run build` | Başarılı; `dist/` içinde NASA anahtarı yok (aranarak doğrulandı) |
| `npm run e2e` | 90/90. Yeni kontroller: 3 × 2 / 2 × 2 sayfalı aday ekranı ve sayfa düğmesi, kalkıştan önce tahmin ve hedef, kart açılınca sahnenin boyutunun aynı kalması (504 → 504 px masaüstü, 203 → 203 px mobil), saati durdurmayan tahmin bandı, “Eve dön” penceresinin 4 satırı ve erken dönüşün başlaması, NASA’ya ve statik dosyaya ulaşılamayınca paketlenmiş veriye düşülmesi. Sonuçlar: Mars/TR “Evdeyiz, ama bedeli oldu”, Ay/EN erken dönüş “Home, but at a cost” |

## v0.7b — arayüz düzeltmeleri (14 Kasım 2026)

- **Aday ekranı:** sayfalama kaldırıldı, 16 aday tek ızgarada. Ekip profili `position: sticky` ile kaydırırken yerinde kalıyor; `.prep-main` için `overflow-x: auto` → `clip` yapıldı (sticky’yi bozuyordu).
- **Üs sahnesi:** `viewBox` `0 90 1000 430` (boş gökyüzü kırpıldı); yükseklik sınırı ve yanlardaki siyah şeritler kaldırıldı. Dünya, Mars Güneşi ve Ay Güneşi’nin yörüngesi aşağı alındı.
- **Görev atama:** bütün aktif ekip ızgara olarak gösteriliyor (4 kişide 2 sütun, 6 kişide 3 sütun); seçilemeyenler gri ve nedeni yazıyor. Plan sekmesindeki düğme sınıfı `prep-pick` olarak ayrıldı; adı `crew-pick` iken karar kartındaki alanı bozuyordu.
- **Kompakt arayüz:** temel yazı 15 px (1700 px ve üstünde 16), sağ panel 340 px, sekmeler sığıyor ve gerekirse yana kayıyor.
- Doğrulama (kısa, kullanıcı isteğiyle): typecheck hatasız, `npm test` 61/61, build başarılı. 1373 px’te ölçüm: sahne 1033 × 444, taşma 0, profil kaydırınca üstten 76 px’te sabit. E2E’nin ilk bölümü 38/38 geçti (tek ızgara, yapışkan profil, 2 × 2 görev atama); uzun 30 günlük oynatma ayrıntılı test oturumuna bırakıldı.

## v0.8 — rastgele iniş, V4 test düzeltmeleri, `bug/eksikler.md` turu (14 Kasım 2026)

Kayıt şeması 7, içerik `0.8.0-landing`. Kaynak: `docs/V4_TEST.md` bulguları ve `bug/eksikler.md`.

- **Rastgele iniş (`src/engine/landing.ts`):**
  - Hedef ekranındaki iki iniş yeri seçeneği kaldırıldı. Kalkışta seed’e bağlı olarak 8 yerden biri seçiliyor (`pickLanding`); her yer bir temel tip (Ay kutup/ekvator, Mars bahar/yaz) ve oyun çarpanları taşıyor: güneş, ısıtma, sera, başlangıç suyu, doğal sığınak, toz, olay ağırlıkları.
  - **Gerçek olan:** yer adları (Shackleton, Mons Mouton, Malapert, Nobile, Haworth, Mare Tranquillitatis, Marius Tepeleri, Oceanus Procellarum, Jezero, Elysium, Arcadia, Utopia, Gale, Meridiani, Valles Marineris, Hellas) ve nitel özellikleri (kutup ışığı, buz, lav tüpü, toz fırtınası havzası). **Oyun varsayımı:** bütün sayılar.
  - Zorluk etiketleri kısa bir bot taramasıyla ayarlandı (yer başına 12 oyun, “ilk açık seçenek” botu, hazırlık yok). Etiketler mutlak değil; aynı tipteki yerleri sıralar. Mars’ta olaysız tahmin yerler arasında az değişiyor (gıda sınırlı); fark daha çok toz fırtınalarında ve olaylarda çıkıyor.
  - Hedef ekranı olası yerleri zorluk çipleriyle listeliyor. Brifing ve yük ekranında tahmin, bütün yerler üzerinden **aralık** olarak gösteriliyor (`estimateRange`, Ay için yaklaşık 50 ms). İniş ekranı yerin adını, zorluğunu, ne anlama geldiğini ve kesin hedefi açıyor. Sahne alt yazısı ve özet filmi yerin adını kullanıyor.
  - `setSite` komutu testler ve araçlar için duruyor; elle seçilen tip, o tipin referans yerini veriyor.
- **V4 bulguları:**
  - 6.1 “Eve dön” saate bağlıydı: kalkış artık her zaman bir sonraki 13:00 penceresinde (`nextDeparture`, `DEPART` kuyruk öğesi). Düğme “Kalkış planlandı”ya dönüşüyor, çip kalan saati gösteriyor ve saat işlemeye devam ediyor. RETURN-01 “bekle” seçeneği 24 saat yerine bir sonraki 13:00’e kadar bekliyor (`waitUntil` efekti).
  - 6.2 Hedefe ulaşınca hemen dönmek baskındı: üst kademe `excellent` (“Tahminin ötesinde”) eklendi; tahmin kadar (en fazla 29 gün) kalan ve herkesi getiren alıyor.
  - 6.3 EMG-MED neredeyse kesin kayıptı: “Onu hasta eden şeyi düzelt” (`treatCause`) eklendi; yaşam desteği, su geri kazanımı ve sızıntıyı onarıyor. Seçenek sınırı 6 olduğu için `rest` kaldırıldı.
  - 6.4 Hasta kendini tedavi edebiliyordu: `availableCrewFor` artık `subjectCrewId` kişisini dışarıda bırakıyor.
  - 6.5 Takviye ekip çoğu zaman inmeden görev bitiyordu: teklif yalnız hedef 20. gün ya da sonrasıysa geliyor.
  - 6.6 Mobilde hız düğmeleri 7 px taşıyordu: 600 px altında “Hız” etiketi gizli, düğmeler daraltıldı, satır sarabiliyor. Ölçüm: 390 px’te taşma 0.
  - 6.7 E2E Windows’ta çalışmıyordu: `fileURLToPath` ve Windows’ta `shell: true`. Windows’ta denenmedi.
  - 6.8 Çipler satır atlayınca sahne kayıyordu: çip satırı tek satır ve yana kayıyor; inmiş takviye ekip ve kargo çipleri gizleniyor.
  - 6.9 MOXIE ve kalkan: kalkan korunmasız SPE dozunu yarıya indiriyor ve meteor çarpmasını önlüyor; MOXIE 0,1 kW, 0,05 kg/sa.
  - Zayıf kararlar yeniden ayarlandı: MOON-01 güneş dizisi %55’ten başlıyor; MARS-02, MARS-SAR, ISRU ve HARVEST-FEAST seçenekleri dengelendi.
- **Stres ve sığınak (eksikler 3):**
  - Fırtına bitince herkes sığınaktan çıkıyor (bir karakterin 8. günden beri sığınakta kalması hatası).
  - Stres 85 ve üstündeyse saatte −0,15 sağlık, +0,3 yorgunluk ve sağlık yenilenmesi yok.
  - Stres 98’e ulaşınca, kişi başına 3 günde bir, `CREW-CRISIS` kartı açılıyor: konuşmak, izin günü, moral kiti ya da “devam”.
- **Özet filmi (eksikler 2):** yüzler artık oyundaki SVG portrelerin kendisi. Portre bir kez SVG’ye çevrilip resim olarak yükleniyor ve tuvale çiziliyor; yüklenemezse eski çizim kullanılıyor. Chromium’da tuvalin kirlenmediği (`getImageData`) doğrulandı.
- **Diğer arayüz:**
  - Brifingte NASA DONKI açıklaması: gerçek olayların görevde aynı günde yaşandığı yazıyor.
  - Uçuş ekranındaki “yolculuk sıkıştırıldı” notu kaldırıldı.
  - Ana sayfanın alttaki dört tanıtım yazısı kaldırıldı. Aynı metinler “Nasıl oynanır” penceresinde duruyor; ilk madde rastgele inişe göre güncellendi.
  - “Hikâyeyi oku”nun yanına **Yapanlar** düğmesi eklendi. İsimler ve portföy linki `src/credits.ts` içinde **boş**; kullanıcı dolduracak.
- **E2E:** site seçimi adımı kaldırıldı; iniş yeri, DONKI açıklaması, Yapanlar penceresi ve kalkış planlama kontrolleri eklendi. `npm run e2e:short` (`E2E_SHORT=1`) her iki profili yüzeyin ilk kontrollerinden sonra bitiriyor; yaklaşık 30 sn.

### v0.8 doğrulama (kısa, kullanıcı isteğiyle)

| Kontrol | Sonuç |
| --- | --- |
| typecheck | Hatasız |
| `npm test` | 66/66. Yeni testler: yerler (her hedefte 8 yer, 4 zorluk, seed’e bağlı seçim), kalkışın her zaman 13:00’te olması, hastanın kendine atanamaması, sığınaktan çıkış ve kriz kartı, hedef 20’den küçükse takviye teklifinin gelmemesi. Değişen beklentiler: MOON-01 %55, tam başarı `success` ya da `excellent`, erken dönüşün 13:00’te başlaması, O₂ senaryosunun yedeği kullanmaması |
| `npm run build` | Başarılı |
| `npm run e2e:short` | 62/62. Masaüstü Mars/TR ve mobil Ay/EN; 390 px’te yüzeyde taşma 0; kalkış planlanınca saat işliyor |
| Özet filmi portreleri | Vite geliştirme sunucusunda ekip sahnesi çizildi; portreler oyundakilerle aynı, tuval kirlenmedi |
| Uzun 30 günlük e2e ve büyük denge taraması | **Yapılmadı**; ayrıntılı test oturumuna bırakıldı |
