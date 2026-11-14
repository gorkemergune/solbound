# Araştırma çıkarımları — oyuna eklenecek detaylar

Sürüm: v0.1 · 14 Kasım 2026 · Hazırlayan: takım (kaynak okuması) + Claude (düzenleme ve doğrulama).

Bu belge, [RESEARCH.md](RESEARCH.md) içindeki NASA sayfalarından takımın çıkardığı notların temizlenmiş halidir. Ham notlar değiştirilmeden [RESEARCH_INFERENCE_RAW.md](RESEARCH_INFERENCE_RAW.md) içinde saklanır.

**Doğrulama:** 14 Kasım 2026'da üç kaynak sayfası (NASA-ECLSS, NASA-DUST, NASA-CROPS) okunup aşağıdaki "K" etiketli bilgiler sayfa metniyle karşılaştırıldı. "Doğrulanmadı" yazan satırlar bu kontrolün dışında kaldı.

## Etiketler

Etiketler, [GAME_SYSTEMS_V2.md](GAME_SYSTEMS_V2.md) araştırma kartındaki `kind` alanıyla birebir eşleşir.

| Etiket | `kind` | Anlamı | Oyunda nasıl sunulur |
| --- | --- | --- | --- |
| **K** | `sourced` | Kaynak sayfada açıkça yazıyor | Kaynak adı ve bağlantısıyla |
| **T** | `derived` | Kaynaktan yapılan çıkarım; kaynakta bu haliyle yazmıyor | "Kaynaktan çıkarım" notuyla |
| **O** | `gameplay` | Oyun için seçilmiş kural veya sayı | "Oyun varsayımı" notuyla; NASA verisi gibi gösterilmez |

## Kullanılan kaynaklar

| ID | Sayfa | Sayfa tarihi | Kapsam sınırı |
| --- | --- | --- | --- |
| NASA-ECLSS | [Environmental Control and Life Support Systems](https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/) | Güncelleme: 4 Nis 2025 | **ISS sistemi.** Ay/Mars üssü performansı değildir. |
| NASA-DUST | [The Fact and Fiction of Martian Dust Storms](https://www.nasa.gov/solar-system/the-fact-and-fiction-of-martian-dust-storms/) | Yayın: 18 Eyl 2015 · Güncelleme: 18 Mar 2026 | Yalnız Mars. *The Martian* filmi üzerinden anlatım içerir. |
| NASA-CROPS | [NASA Plant Researchers Explore Question of Deep-Space Food Crops](https://www.nasa.gov/science-research/nasa-plant-researchers-explore-question-of-deep-space-food-crops/) | Yayın: 17 Şub 2016 · Güncelleme: 28 Eyl 2023 | Mars ve uzay aracı odaklı. **Ay'dan hiç bahsetmez.** |

`RESEARCH.md`'deki NASA-LSS ve NASA-POWER kaynakları bu notlarda kullanılmadı.

---

## 1. Yaşam desteği döngüsü (NASA-ECLSS · ISS)

| ID | Bilgi | Etiket |
| --- | --- | --- |
| LS-01 | Su Geri Kazanım Sistemi temiz suyu şunlardan elde eder: atık su (mürettebatın idrarındaki su dahil), kabin nemi yoğuşması ve uzay yürüyüşü kıyafetlerinin içindeki hidrasyon sisteminden gelen su. | K |
| LS-02 | Su saflığı elektriksel iletkenlik sensörleriyle kontrol edilir. Uygun olmayan su yeniden işlenir; temiz su kullanıma hazır depoya gönderilir. | K |
| LS-03 | Sistem şu anda **istasyondaki** suyun yaklaşık %90'ını geri kazanıp yeniden kullanabilir. | K (yalnız ISS) |
| LS-04 | Eser kirleticiler, kabin havası üç üniteden geçirilerek giderilir: aktif karbon yatağı, katalitik oksitleyici, lityum hidroksit yatağı. CO₂, gazları boyutlarına göre ayıran moleküler eleklerle tutulur. | K |
| LS-05 | Oksijen üretim düzeneği, Su Geri Kazanım Sistemi'nden gelen suyu elektrolizle ayırır; ürünler oksijen ve hidrojendir. Oksijen kabine verilir. Hidrojen uzaya atılır ya da CO₂ indirgeme düzeneğine gönderilir. | K |
| LS-06 | CO₂ indirgeme düzeneği bu hidrojeni mürettebatın soluduğu CO₂ ile bir Sabatier reaktöründe kullanır. Ürünler metan (uzaya atılır) ve mürettebat için sudur. | K |

**Çıkarımlar**

- Su ve oksijen ayrı stoklar değil, birbirine bağlı tek bir döngüdür: su → elektroliz → O₂ + H₂ → (H₂ + CO₂) → su + metan. **T**
- Geri kazanım %100 değildir. Her gün döngüden bir miktar su kaybolur; rezerv ve yedek filtre bu yüzden anlamlıdır. Oyundaki kayıp oranı **O**; %90 değeri yalnız "ISS'te" notuyla gösterilir.
- Elektroliz ve geri kazanım enerji ister. Kaynak sayfa enerji miktarı vermez; enerji maliyeti **O**.
- Lityum hidroksit yatağının değiştirilmesi gereken bir sarf malzemesi olduğu kaynak sayfada yazmaz. Oyundaki "yedek filtre" eşyası bu yüzden **O** etiketi taşır.

**Hedef:** Ay ve Mars. İki hedefte de kapalı yaşam desteği gerekir. ISS verisi üs performansı gibi sunulmaz.

---

## 2. Mars toz fırtınaları ve güneş enerjisi (NASA-DUST)

| ID | Bilgi | Etiket |
| --- | --- | --- |
| DS-01 | Her yıl orta büyüklükte toz fırtınaları çıkar; kıta büyüklüğünde alanları kaplar ve haftalarca sürer. *(Michael Smith, NASA Goddard)* | K |
| DS-02 | Ortalama her üç Mars yılında bir (yaklaşık 5½ Dünya yılı) normal fırtınalar gezegeni saran "küresel toz fırtınalarına" dönüşür. *(Smith)* | K |
| DS-03 | En güçlü Mars fırtınalarında rüzgâr saatte yaklaşık 60 mile (≈97 km/sa, **T**: birim dönüşümü) ulaşır; bu, Dünya'daki bazı kasırga rüzgârlarının hızının yarısından azdır. Mars'ın atmosfer basıncı çok daha düşük olduğu için cisimler savrulur ama aynı şiddette değil. *(William Farrell)* | K |
| DS-04 | Toz parçacıkları çok küçük ve hafif elektrostatiktir; strafor köpüğü gibi yüzeylere yapışır. Dişliler gibi hareketli mekanik parçalara girer. *(Smith)* | K |
| DS-05 | Yalnız birkaç adım genişliğindeki toz hortumları bile ekipmanı kaplayıp panellere düşen güneş ışığını azaltabilir. | K |
| DS-06 | Küresel fırtınalar atmosfere yeterince toz kaldırıp yüzeye ulaşan güneş ışığını azaltır. Böyle zamanlarda yüzeydeki ekipman genellikle tozun yatışmasını bekler: ya bataryayı korumak ya da hassas donanımı korumak için. | K |
| DS-07 | Büyük fırtınalar genellikle yalnız güney yarımkürenin yazında olur. Mars yörüngesi daha az dairesel olduğundan yılın bir bölümünde gezegen Güneş'e daha yakın ve belirgin şekilde daha sıcaktır. Başlayan büyük fırtınalar haftalarca, hatta aylarca sürebilir. | K |
| DS-08 | Güneş ışığı yüzeye yakın havayı ısıtır; sıcak hava yükselirken tozu taşır. Küresel fırtına güneşi yeterince kapatınca kendi sonunu da getirir. | K |
| DS-09 | Astronotun her gün panel temizlemesi *The Martian*'dan bir sahnedir. Kaynak, bunun gelecekteki astronotlar için gerçek bir zorluk "olabileceğini" söyler. | T |

**Ham notta düzeltilen önemli nokta:** "Rüzgâr ekipmana zarar verebilir" ifadesi kaynağın ana mesajıyla çelişiyor. Kaynağa göre en büyük fırtınadaki rüzgâr bile büyük mekanik ekipmanı deviremez veya parçalayamaz, bir astronotu mahsur bırakması da pek olası değildir. Asıl tehlike tozun kendisidir: panelleri örter, ışığı keser ve hareketli parçalara girer.

**Çıkarımlar**

- Toz iki ayrı katmanda etki eder: paneldeki toz (temizlenebilir) ve atmosferdeki toz (temizlenemez). Bu, `STORY_EVENTS.md`'deki MARS-02 tasarımıyla zaten uyumlu. **T**
- Büyük bir fırtına 3 günlük demodan da 30 günlük kampanyadan da uzun sürebilir. Oyunda fırtınanın görev bitene kadar sürmesi gerçekçi bir sonuçtur. Süre ve şiddet **O**.
- Küresel fırtına ortalama üç Mars yılında bir görülür; 30 günlük bir görevde yaşanması nadir olmalıdır. Oyunda bilinçli olarak eklenirse "oyun için seçilmiş senaryo" notu taşır. **T/O**

**Hedef:** Yalnız Mars. `GAME_SYSTEMS_V2.md` gereği Ay için toz fırtınası kartı kullanılmaz. Ay tozu (regolit) farklı bir konudur ve ayrı kaynak ister.

---

## 3. Sera ve bitki yetiştirme (NASA-CROPS)

| ID | Bilgi | Etiket |
| --- | --- | --- |
| CR-01 | Bitki yetiştirmenin temel unsurları su, ışık, büyüme ortamı ve besin maddeleridir. | K — doğrulanmadı |
| CR-02 | Patates, tatlı patates, buğday ve soya fasulyesi iyi seçeneklerdir: bol karbonhidrat sağlarlar; soya iyi bir protein kaynağıdır. *(Ray Wheeler)* | K |
| CR-03 | Eşit ışık verildiğinde patates bazı tohum bitkilerinin iki katı kadar gıda üretebilir. Patates yumru köklüdür; yenilebilir kısmını toprak altında depolar. *(Wheeler)* | K (yumru kısmı doğrulanmadı) |
| CR-04 | Wheeler'ın patates çalışmaları sığ, eğimli tepsilerde hidroponik devridaim sistemiyle yapıldı. Patates suya batırılmayı sevmez; derin veya durgun su kullanılamaz. | K |
| CR-05 | Başka bir gezegene giden araç taşınabilecek malzemenin miktarını ve ağırlığını sınırlar; uzun bir yolculuk için gereken her şey paketlenemez. | K — doğrulanmadı |
| CR-06 | Mars'ta bulunan su saf değildir, tuzlu su bileşimindedir. Regolitte perkloratlar ve başka safsızlıklar bulunduğu bilinir; su kullanılmadan önce bunlar hesaba katılıp giderilmelidir. *(Rob Mueller)* | K |
| CR-07 | Mars, Güneş'e uzaklığı nedeniyle Dünya'nın aldığı güneş ışığının %43'ünü alır. Yine de düşük enlemlerde bitki yetiştirmeye yetecek ışık alan çok sayıda bölge vardır. | K |
| CR-08 | Toz fırtınaları güneş ışığının büyük kısmını engelleyebilir. Bitkileri güçlü beslemek için yüksek yoğunluklu, verimli LED'ler kullanılabilir. ISS'teki Veggie sistemi mavi ve kırmızı LED kullanır. | K |
| CR-09 | Bitkiler UV radyasyonundan korunmalı ve basınçlı bir ortamda tutulmalıdır. Barınak radyasyona ve Mars'ın aşırı sıcaklıklarına dayanmalıdır. **Isı** sorunları geceleri kapanıp gündüz açılan bir örtü veya istiridye kabuğu gibi açılır kapanır bir yapıyla hafifletilebilir. | K |
| CR-10 | Patatesin "gözleri" (tomurcukları) vardır. Yeterli zaman verilirse filizlenir; en az bir göz içeren parçalar yeniden ekilerek yeni bitki elde edilebilir. | K |
| CR-11 | Bitkiler fotosentezle oksijen üretir ve kabin havasından CO₂ temizler. Doğru biçimde kullanılırsa atık suyun işlenmesine yardım edebilirler. Atık su, hatta idrar, besin kaynağı olarak kullanılabilir — kaynak bunu "bir seçenek olabilir" diye anlatır. | K |

**Ham notta düzeltilenler**

- "Radyasyondan korunma" başlığı altındaki örtü önerisi radyasyon için değil, **ısı** içindir. Radyasyon koruması barınak malzemesinin işidir (CR-09).
- "Çiğ olarak tüketilebilirler" ifadesi patatese mi, salata bitkilerine mi ait, belli değil. Bu kontrolde doğrulanmadı; oyunda kullanılmaz.
- Mavi-kırmızı LED, ISS'teki Veggie sistemine aittir; Mars serası için doğrulanmış bir tasarım değildir.

**Çıkarımlar**

- Sera hem gıda hem hava hem de su döngüsüne bağlanır (CR-11 + LS-01). Ancak katkısının büyüklüğü kaynakta yok; seranın yaşam desteğinin yerini tutmaması **O**.
- Mars'ta güneş zaten az (CR-07) ve toz bunu daha da azaltır (DS-06). Bu yüzden LED'lere enerji ayırmak ya da serayı kısmak MARS-02'deki ödünleşimin bilimsel gerekçesidir. **T**
- Büyüme süreleri ve hasat miktarları kaynakta yok; hepsi **O**. 3 günlük demoda hasat olacaksa, sera "önceden yetiştirilmiş" diye tanıtılır ya da zaman sıkıştırması arayüzde söylenir (`RESEARCH.md` açık konusu).
- CR-05, 100V kargo sınırının gerekçesi olarak kullanılabilir. 100V'nin kendisi yine soyut bir oyun birimidir (**O**).

**Hedef:** Hidroponik ve ürün seçimi iki hedefte de kullanılabilir (**T**). Işık, toz ve perklorat bilgileri yalnız Mars'a aittir. Ay serası için ayrı kaynak gerekir.

---

## 4. Takım fikirleri (kaynak dışı)

| ID | Fikir | Etiket | Not |
| --- | --- | --- | --- |
| IDEA-01 | Gezegenin bir yerinde arama-kurtarma görevi | O | Kurgusal olay. Fiziksel ayrıntıları (görüş mesafesi, iletişim, yürüyüş süresi) ayrıca kaynaklanmalı. DS-03 gereği "fırtına kişiyi savurdu" gibi bir neden kullanılmamalı. |
| IDEA-02 | 1 Mars yılı ≈ 1,88 Dünya yılı | Kaynak bekliyor | Doğru bilinen bir değer, ama yukarıdaki üç sayfada yok. Kullanılacaksa NASA'nın Mars bilgi sayfasından kaynak eklenmeli. DS-02 ile tutarlı (3 × 1,88 ≈ 5,6). |

---

## 5. Uygulamaya eklenecek detay özellikler

Öncelik: **Demo** = 3 günlük dikey kesitte yer alabilir · **P1** = 30 günlük kampanya genişlemesi. Bütün sayısal etkiler **O** etiketlidir ve veri dosyasında tanımlanır.

| ID | Özellik | Hedef | Bağlandığı yer | Dayanak | Öncelik |
| --- | --- | --- | --- | --- | --- |
| F-01 | **Su–oksijen döngüsü araştırma kartı:** döngünün şeması; elektrolizin su tükettiği ve geri kazanımın %100 olmadığı açıkça gösterilir | Ay + Mars | Araştırma kartı, MARS-01 | LS-01…06 | Demo |
| F-02 | **Su kalitesi uyarısı:** sensör uygunsuz su tespit eder, su yeniden işlenir; zaman ve enerji kaybı | Ay + Mars | MARS-01 seçeneği | LS-02 | Demo |
| F-03 | **Hidrojen kararı:** uzaya at (basit) veya Sabatier'e gönder (su geri kazanılır, enerji ve bakım ister) | Ay + Mars | Yeni küçük olay | LS-05, LS-06 | P1 |
| F-04 | **İki katmanlı toz:** panel temizliği yüzeydeki tozu kısmen giderir; atmosferdeki tozun azalttığı ışığa etkisi yoktur | Mars | MARS-02 | DS-05, DS-06 | Demo |
| F-05 | **"Gerçek mi kurgu mu?" kartı:** Mars rüzgârı üssü devirmez; asıl sorun tozdur | Mars | Küçük araştırma olayı | DS-03, DS-04 | Demo |
| F-06 | **Toz hareketli parçalara girer:** dişli veya eklem aşınması; parça kiti bu onarımı mümkün kılar | Mars | RETURN-02 veya küçük olay | DS-04 | Demo |
| F-07 | **Fırtınayı bekle modu:** bataryayı ve hassas donanımı korumak için dış işleri durdur | Mars | MARS-02 seçeneği | DS-06 | Demo |
| F-08 | **Mevsim brifingi:** güney yarımküre yazında büyük fırtına riskinin arttığı ve fırtınaların haftalarca sürebileceği anlatılır | Mars | Briefing ekranı | DS-07, DS-01 | P1 |
| F-09 | **LED / güneş ödünleşimi:** sera ışığı için enerji ayır ya da büyümeyi yavaşlat | Mars | MARS-02, MARS-03 | CR-07, CR-08 | Demo |
| F-10 | **Ürün seçimi:** patates (daha çok gıda, karbonhidrat) ve soya (protein) gibi seçenekler arasında tercih | Ay + Mars | Sera kiti, MARS-03 | CR-02, CR-03 | P1 |
| F-11 | **Ye ya da yeniden ek:** hasattan gözlü parçaları ayırmak gelecekteki gıdayı güvenceye alır | Ay + Mars | 30 günlük sera döngüsü | CR-10 | P1 |
| F-12 | **Hidroponik su paylaşımı:** sera, geri kazanılan sudan pay alır; atık su ve idrar besin olarak kullanılabilir | Ay + Mars | Kaynak modeli | CR-04, CR-11, LS-01 | P1 |
| F-13 | **Sera örtüsü:** gece kapatılır, gündüz açılır; unutulursa ısı kaybı olur | Mars | Günlük rutin görev | CR-09 | P1 |
| F-14 | **Yerel su arıtma:** Mars suyu perklorat içerir; arıtma modülü kurulmadan kullanılamaz | Mars | Modül veya olay | CR-06 | P1 |
| F-15 | **Kargo ekranı notu:** "Her şeyi paketleyemezsin" (100V'nin gerekçesi) | Ay + Mars | Kargo ekranı | CR-05 | Demo (CR-05 doğrulandıktan sonra) |
| F-16 | **Arama-kurtarma görevi** | Mars (Ay için ayrı kaynakla) | Yeni ana olay | IDEA-01 | P1 |

Demo için önerilen en küçük set: **F-01, F-02, F-04, F-07, F-09**. Bunlar mevcut MARS-01 ve MARS-02 olaylarına doğrudan oturur ve yeni olay yazmayı gerektirmez.

---

## 6. Açık boşluklar

1. **Ay için hiç kaynak yok.** MOON-01 (güç dağıtımı / uzun gece), MOON-02 (sızdırmazlık) ve MOON-03 (parçacık olayı) için birincil NASA kaynağı gerekli. Ay ile Mars arasındaki anlamlı fark şu an yalnız Mars tarafında kaynaklı.
2. **Radyasyon için kaynak yok.** CR-09 yalnız seranın UV ve radyasyondan korunması gerektiğini söylüyor; mürettebat radyasyonu, güneş parçacık olayları ve sığınak için kaynak lazım.
3. **Doğrulanmamış satırlar:** CR-01, CR-03'teki yumru bilgisi, CR-05 ve "çiğ tüketim" ifadesi bir sonraki kaynak okumasında kontrol edilmeli.
4. **Kullanılmayan kaynaklar:** NASA-LSS ve NASA-POWER. Özellikle NASA-POWER, Mars'ta güneş yerine başka güç seçeneklerini karşılaştırmak için faydalı olabilir.
5. **Sayısal değer yok:** kaynaklarda geri kazanım oranı (%90, ISS), güneş ışığı oranı (%43) ve rüzgâr hızı (60 mph) dışında sayı yok. Enerji tüketimi, büyüme süresi, LED gücü ve fırtına olasılığı gibi bütün oyun sayıları **O** etiketiyle seçilecek.
