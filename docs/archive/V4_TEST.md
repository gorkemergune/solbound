# V4 bağımsız test raporu — Solbound v0.7 (`0.7.0-goal`)

Tarih: 14 Kasım 2026 · 50.000 simüle oyun (10 × 5.000 parça, 0 hata) · tablolar: [summary_v4.json](summary_v4.json) · önceki test: [V3_TEST.md](V3_TEST.md), [summary_v3.json](summary_v3.json)

## 1. Kısa özet

1. **Mars'ta "Eve dön"ün sonucu saate bağlı (yeni, en kritik hata).** Dönüş kontrolü bataryayı düğmeye basıldığı andaki değerle ölçüyor. Mars baharında hedefe ulaşıp sabah 07:00'de dönen ekip 80 oyunun 26'sında tam başarı alıyor, aynı ekip 13:00'te dönünce 74'ünde. "Bir gün bekle" 24 saat sonra yine sabaha denk geldiği için sorunu çözmüyor. 50.000 oyunluk taramada özenli bot Mars baharında yalnız %14,2 tam başarı alıyor; nedeni bu.
2. **V3'ün dört bulgusu düzeldi, biri kısmen düzeldi, ikisi sürüyor.**
   - **Düzeldi:** Bahar tuzağı, gıda paketinin baskınlığı, RETURN-02'de "yedek hat"ın baskınlığı ve tempo.
   - **Kısmen:** Acil durum yedeği oyunu nadiren kurtarıyor.
   - **Sürüyor:** Tıbbi acil durum hâlâ neredeyse kesin kayıp (görüldüğü oyunlarda başarı %0,4). Ekip uyumu yeteneğinin sonuca ölçülebilir olumlu etkisi yok.
3. **Hedef sistemi oyuncuyu erken dönmeye itiyor.**
   - Hedefe ulaşınca dönen özenli bot: %58,1 tam başarı, %2,2 kayıp.
   - Aynı kararları verip 30 güne kalan bot: %48,7 tam başarı, %7,7 kayıp.
   - Kalmak bilimi neredeyse ikiye katlıyor (ortalama 335 / 190 puan), ama bilim sonucu etkilemiyor.
   - Ayrıca hazırlık tahmini uzattığı için hedefi de yükseltiyor; bu yüzden eşya ve uzmanlıkların etkisi büyük ölçüde sıfırlanıyor.

API anahtarı temiz: `vite.config.ts`'te `NASA_` öneki yok, `dist/` içinde gerçek anahtar yok, yalnız `DEMO_KEY` var.

## 2. Yöntem ve sınırlar

**Yöntem.**
- Oyunlar `applyCommand` komut kapısıyla oynandı.
- Kargo `setCargo` ile gerçek 520 kg kütle bütçesine uyarak yüklendi; kalkış normal `launch` komutuyla yapıldı. Oyuncu ve 16 aday seed'den üretildi.
- `prepared()` ve `launchAnyway()` kullanılmadı.
- İş 5.000 oyunluk parçalara bölündü; her parça ayrı bir Node işleminde çalıştı.
- Her oyundan diske yalnız küçük bir özet satırı yazıldı. Her parçanın toplanabilir sayaçları ayrı bir dosyaya kaydedildi ve sonda birleştirildi.
- 10 parça × 5.000 = **50.000 oyun**, hata yok, toplam yaklaşık 7,5 dakika. Saat adımı 6 saat; motor olay eşiğinde durduğu için olay atlanmaz.

**Eksenler** (V3 ile aynı):
- Hedef: Ay kutup, Ay ekvator, Mars bahar, Mars yaz; her biri 12.500 oyun.
- Ekip: 16 adaydan rastgele 3 kişi.
- Kargo: boş %10, az %25, rastgele %35, dolu %30.
- Mod: keşif %25, normal %75.
- DONKI anlık görüntüsü: %50 var, %50 yok.
- Takviye ekip teklifi (Ay): kabul, kargo ve ret eşit olasılıkla.

**Oyuncu tipleri:**
- **Özenli (%20):** V3 tablosundaki tercihler. Bütün hazırlık görevlerini yapar, acil durumda yedeği seçer, hedefe ulaşınca "Eve dön"e basar.
- **Özenli-kalan (%8):** Yeni bir kontrol botu. Özenli ile aynı kararları verir ama "Eve dön"e hiç basmaz. Hedefe ulaşınca dönmenin baskın strateji olup olmadığını ölçmek için eklendi.
- **Karışık (%30):** Kararların %70'inde özenli, %30'unda rastgele; hazırlıkların %70'ini yapar; hedefte döner.
- **Rastgele (%20):** Açık seçenekler arasından eşit olasılıkla seçer, hazırlıkların %50'sini yapar.
- **Pervasız (%12):** V3'teki pervasız tercihler; hiç hazırlık yapmaz.
- **Erken dönen (%10):** Özenli gibi oynar, ama 2. gün ile hedeften bir gün öncesi arasında rastgele bir anda "Eve dön"e basar.

Mars baharındaki MARS-02 kararında özenli botlar "fırtınayı bekle" ile "ekonomik mod" arasında yarı yarıya seçer; V3 tuzağının düzeltmesini sınamak için.

**Ek deneyler:**
- "Eve dön" saati deneyi: 80 seed × 2 mevsim × 3 saat.
- Gerçek motor kayıtlarıyla arayüz denetimi.
- Seçeneklerin etkisini ayırmak için yalnız rastgele oyuncunun verisi.

**Sınırlar:**
- Oyunları botlar oynadı.
- Botlar araştırma kartı açmaz, rutin değiştirmez, güç önceliğini, sera modunu, sera örtüsünü ve hidrojen modunu elle değiştirmez. Görev atamasında motorun önerdiği kişileri kullanır. Hızı ve duraklatmayı kullanmaz.
- "Eve dön"e, hedef gününü geçtikten sonraki ilk 6 saatlik adımda basar; bu çoğunlukla sabaha denk gelir. Bunun etkisi 6.1'de ölçüldü.
- Eşya ve uzmanlık etkileri korelasyondur: aynı hedefte "var / yok" farkı hedeflere göre ağırlıklanarak hesaplandı.
- Olay seçeneklerinin "karar sonrası başarı" değerleri oyuncu tipiyle karışıktır; bu yüzden ayrıca yalnız rastgele oyuncu verisi verildi. O oyuncu seçeneği eşit olasılıkla seçtiği için fark nedenselliğe daha yakındır.
- "Oyuncuyu tutan an" doğrudan ölçülemez; 7. bölümdekiler vekil göstergelerdir.

## 3. Kimler geçiyor — V3 ve V4

| | V3 tam / kayıp | V4 tam | V4 kısmi | V4 erken bitiş | V4 kayıp |
| --- | --- | --- | --- | --- | --- |
| Genel | %29,9 / %9,4 | %29,4 | %45,6 | %18,1 | %7,0 |
| V3'teki 4 tip (karşılaştırılabilir) | %29,9 / %9,4 | %31,0 | %39,6 | %21,7 | %7,6 |
| Özenli (hedefte döner) | %60,2 / %6,2 | %58,1 | %38,9 | %0,7 | %2,2 |
| Özenli-kalan (yeni) | — | %48,7 | %40,7 | %3,0 | %7,7 |
| Karışık | %36,9 / %8,2 | %43,2 | %48,0 | %5,2 | %3,5 |
| Rastgele | %7,2 / %10,5 | %3,9 | %40,6 | %41,9 | %13,7 |
| Pervasız | %0,5 / %15,7 | %0,2 | %18,4 | %64,6 | %16,9 |
| Erken dönen (yeni) | — | %0 | %98,9 | %0,3 | %0,8 |

| Hedef | V3 genel tam | V4 genel tam | V3 özenli | V4 özenli | V4 özenli-kalan |
| --- | --- | --- | --- | --- | --- |
| Mars bahar | %16,2 | %9,8 | %37,6 | %14,2 | %38,1 |
| Mars yaz | %25,4 | %27,0 | %52,0 | %55,3 | %44,6 |
| Ay ekvator | %39,9 | %42,6 | %77,5 | %82,7 | %59,6 |
| Ay kutup | %38,1 | %38,2 | %73,8 | %79,6 | %51,4 |

**Diğer eksenler:**
- **Keşif modu:** Kayıp %0, tam başarı %29,8; normal modda %29,3. Tasarlandığı gibi çalışıyor.
- **DONKI anlık görüntüsü:** Varken %29,1 tam başarı ve %7,6 kayıp, yokken %29,6 ve %6,3.
- **Kargo:** Boş kargoda tam başarı %23,5, rastgele kargoda %31,2. V3'te bu fark 12,8 / 36,3 idi.
- **Neden tam başarı olmuyor:**
  - Kısıtlı dönüş: 17.132 oyun.
  - Erken bitiş: 9.228.
  - Sert iniş: 8.908.
  - Hedefe ulaşmadan dönüş (`reason.early`, yeni): 4.905.
  - Kayıp: 4.113.
  - Tahliye: 2.207.
- **Kayıpta karşılanamayan ihtiyaç:** O₂ %66, güç %64, su %37. V3'te su %73, güç %85 idi.
- **Kayıp zamanı:** Kayıpların %55'i 20–30. günlerde (V3: %85).

## 4. V3 bulgularının durumu

1. **Mars baharı tuzağı — tuzak düzeldi, bahar ise başka bir nedenle kötüleşti.**
   - Fırtına bitince sera artık önceki moduna dönüyor (`src/engine/sim.ts:205`).
   - Baharda özenli botlarda: "fırtınayı bekle" %17,3, "ekonomik mod" %20,1 tam başarı. V3'te bu fark %0'a karşı yaklaşık %33 idi.
   - Fırtına bekleyen 1.449 oyunun 304'ünde sera önceki tam moduna döndü.
   - Bahar başarısı ise düştü: genelde %16,2'den %9,8'e, özenli botta %37,6'dan %14,2'ye. Nedeni yeni "Eve dön" saati hatası (6.1). Aynı kararlarla 30 güne kalan bot %38,1 alıyor. Öğlen dönüşte bahar başarısı 80 oyunda 74.
2. **Gıda paketinin baskınlığı — düzeldi, ama eşyaların çoğunun etkisi de sıfıra yaklaştı.** Lift değerleri (tam başarı puan farkı):

   | Eşya | Ay V3 → V4 | Mars V3 → V4 |
   | --- | --- | --- |
   | Gıda | +18,0 → +2,7 | +22,6 → +0,7 |
   | Patates | +11,7 → +1,5 | +15,5 → +4,2 |
   | Filtre | +4,5 → +1,1 | +11,5 → +7,7 |
   | Batarya | +2,5 → 0 | +1,1 → **+5,3** |
   | Yedek parça | +3,0 → **+4,9** | +1,7 → +1,0 |
   | Kalkan (32 kg) | +1,8 → +0,8 | +0,5 → +0,2 |
   | MOXIE (24 kg) | — | −4,5 → **−2,2** |

   - En başarılı 2'li kargo setleri artık gıda değil: Ay'da yedek parça, Mars'ta batarya etrafında toplanıyor.
   - MOXIE hâlâ zararlı, kalkan hâlâ etkisiz.
   - Sebep yalnız ağırlık değişikliği değil. Fazla yük tahmini kalışı uzatıyor (medyan tahmin: boş kargoda 20, dolu kargoda 23 gün), bu da hedefi yükseltiyor. Bkz. 6.2.
3. **Acil durumlar — kısmen düzeldi.**
   - Acil durum yaşanan oyunlarda yedek kullanılırsa: %7,0 tam başarı, %23,4 kayıp, %35,2 erken bitiş. Kullanılmazsa: %1,3 tam başarı, %13,8 kayıp, %70,5 erken bitiş.
   - Yedek erken bitişi azaltıyor ama kaybı artırıyor; tam başarı yine nadir.
   - Rastgele oyuncuda O₂ acil durumu: yaşam desteğini onarmak %45,9, yedek %20,4 oranında kayıp veya erken bitiş olmadan dönüşle bitiyor. Yedek asıl nedeni çözmüyor.
   - Tıbbi acil durum görüldüğü oyunlarda tam başarı %0,4 (V3: %0,7); tıbbi dengeleme seçildiğinde %0,2. **Bu bulgu sürüyor.**
   - Su acil durumunda tam başarı %1,8.
4. **Dönüş seçenekleri — düzeldi.**
   - RETURN-02'de "yedek hat" artık şansa bağlı; zar başarısı %80,4. Tam başarı payları: yedek hat %59,9, yedek parça %51,2, elle onarım %8,4, güç kısma %0. V3'te yedek hat %99,7 ile baskındı.
   - RETURN-01'de "bir gün bekle"den sonra başarı %18,7 (V3: %5,4).
   - Ancak Mars baharında özenli botun 2.519 oyununun 2.132'si "bekle → kısıtlı dönüş" ile bitiyor; saat sorunu bkz. 6.1.
5. **Tempo — düzeldi.**

   | | V3 | V4 |
   | --- | --- | --- |
   | Kararsız gün oranı | %33,1 | %25,1 |
   | 2. gün olay sayısı | 0,61 | 1,63 |
   | 26–29. gün olay / gün (yüzeyde kalan oyunlarda) | 0,80 / 0,70 / 0,55 / 0,22 | 1,93 / 1,71 / 1,14 / 1,39 |
   | Oyun başına duraklama (medyan, p10–p90) | 36 (28–41) | 27 (17–37) |
   | Tahminden gelen duraklama / oyun | 3,56 | 0 |

   - 30. gün 14:00'te bittiği için yarım gün sayılmadı; o gün bütün oyunlar ortalamasında 0,35 olay var.
   - Duraklama sayısındaki düşüşün bir kısmı, hedefte dönen botların daha kısa kalmasından geliyor.
   - Yeni olaylar her oyunda veya sık görülüyor: SETUP %100, PACK %20,5, FINAL-EVA %24,7.
6. **Ekip uyumu ve uzmanlıklar — kısmen.**
   - Ekip uyumu toplamına göre tam başarı: 180'in altında %30,6, 240 ve üstünde %26,8. Kayıp %6,5 / %7,7. Olumlu etkisi hâlâ görünmüyor.
   - Uzmanlık lift değerleri (V3 → V4, bütün hedefler):

     | Uzmanlık | V3 | V4 |
     | --- | --- | --- |
     | Haberleşme | −4,3 | −0,9 |
     | Kimyager | −4,1 | **−4,9** |
     | Uzay havası | −3,4 | −2,0 |
     | Botanikçi | −3,4 | −1,0 |
     | Arabulucu | −3,2 | −1,8 |
     | Soğukkanlı | −3,1 | −1,6 |

   - Beşi iyileşti, kimyager kötüleşti, hepsi hâlâ negatif.
   - Levazımcı (+7,5 → −1,7) ve beslenme uzmanı (+6,9 → −2,4) negatife döndü. Muhtemel neden: kalışı uzatıp hedefi yükseltiyorlar (6.2).
   - En faydalılar artık teknik uzmanlıklar: enerji +5,4, EVA +4,4, mekanik +3,8, pilot +3,3, gezici sürücüsü +3,3.
7. **API anahtarı — düzeldi.**
   - `vite.config.ts` içinde `envPrefix` veya `NASA_` yok.
   - `npm run build` sonrası `dist/` içinde gerçek anahtar **yok**. `api_key=` yalnız kod şablonunda (`api_key=${encodeURIComponent(e)}`) geçiyor; kullanılan değer `DEMO_KEY`.
   - Gerçek anahtar `dist/donki-latest.json`'da, git geçmişinde ve takip edilen dosyalarda da yok.
   - `.github/workflows/donki-snapshot.yml` anahtarı depo sırrından okuyor.

## 5. Yeni özelliklerin değerlendirmesi

**Tahmini kalış ve hedef (`estimateStay`):**
- Medyan tahmin (hedef): Mars bahar ve yaz 23 gün (19), Ay ekvator 15 (12), Ay kutup 26 (22).
- Tahmini sınırlayan kaynak:
  - Ay ekvator: her oyunda batarya (Ay gecesi).
  - Mars: %77 gıda; kalanında 30 güne kadar darboğaz yok.
  - Ay kutup: %61 gıda, %31 su.
- Kargo tahmini uzatıyor: medyan boş kargoda 20, az kargoda 21, rastgele ve dolu kargoda 23 gün.
- Hedefe ulaşma oranı: bütün oyunlarda %78. Özenli %97,4, karışık %91,5, rastgele %75,6, pervasız %67,2.
- Hedefe ulaşmayan 10.984 oyunun hiçbiri tam başarı almadı; %41'i erken bitti, %14'ü kayıpla sonuçlandı.
- Tahmin, özenli oyuncu için temkinli: 30 güne kalan bot tahminden medyan 6 gün daha uzun kaldı (p10 −1, p90 +14 gün).
- "Olaylar yüzünden tahminden önce tüketilen" oyun payını güvenilir ölçemedim. Ölçümüm her adımda baktığı için gece batarya düşüşlerini de sayıyordu; tahmin ise öğlen yapılıyor. Bu yüzden o sayıyı kullanmadım.

**Eve dön:**
- Erken dönen botun oyunlarının %98,9'u kısmi başarı; tam başarı hiç yok. Hedefin %50'sinden önce dönülse de sonra dönülse de sonuç aynı. Kural tutarlı.
- **"Hedefe ulaşınca hemen dön" baskın:**

  | | Hedefte dönen | 30 güne kalan |
  | --- | --- | --- |
  | Tam başarı | %58,1 | %48,7 |
  | Kayıp | %2,2 | %7,7 |
  | Ortalama yüzey günü | 18,3 | 28,6 |
  | Ortalama bilim | 190 | 335 |

  Kalmak bilim getiriyor, ama sonuç notu bilimi dikkate almıyor. Oyuncunun 30 güne kalması için sonuçta görünen bir neden yok.

**Takviye ekip (Ay):**
- Teklif Ay oyunlarının hepsinde (25.000) geliyor.

  | Seçim | Tam başarı | Kayıp |
  | --- | --- | --- |
  | Kabul | %39,8 | %8,7 |
  | Kargo | %41,9 | %6,8 |
  | Ret | %39,4 | %7,6 |

- Seçimler arasındaki fark küçük: rastgele oyuncuda 3,7 puan, tüm oyuncularda 2,5 puan.
- Kabul edilen 8.318 oyunun yalnız 3.185'inde (%38) ekip gerçekten 6 kişiye çıkıyor. Kalanlarda oyuncu, takviye ekip 20. günden önce inemediği için o tarihten önce dönmüş oluyor.
- Ay ekvatorunda kargo seçeneği belirgin daha iyi (%46,3 / %39,2). Ekvatorun medyan hedefi 12. gün; takviye ekip oraya hiç yetişmiyor.
- Ekip gelince "hoş geldin" seçeneği rastgele oyuncuda %71,4 oranında kayıp veya erken bitiş olmadan dönüşle bitiyor; "dar alan"da %66,0.

**Seçenek zenginliği:** Rastgele oyuncuda en iyi ile en kötü seçenek arasındaki fark, yani kayıp veya erken bitiş olmadan dönüş oranı (puan):
- **Kaderi değiştirenler:**
  - Su işleme (MARS-01): filtre değiştir %97,2 / damıtıcı %14,8. Fark 82,4 puan.
  - O₂ acil durumu: 44,7.
  - Ay depremi (QUAKE): 42,4.
  - Tıbbi acil durum: 35,7.
  - Sızdırmazlık (MOON-02): 31,3.
  - Su acil durumu: 23,3.
  - Parçacık olayı (MOON-03): 14,7.
  - Tuzlu su (BRINE): 14,5.
  - Ay gecesi (NIGHT): 12,5.
- **Neredeyse etkisiz (2 puandan az):**
  - Güç dağıtımı (MOON-01): 0,6.
  - Mars arama-kurtarma: 0,9.
  - Hasat şöleni: 1,0.
  - Ay ekip anı (MOON-S2): 1,6.
  - Kayadan oksijen (ISRU): 1,6.
  - Ay arama-kurtarma: 1,7.
  - Toz fırtınası (MARS-02): 1,8.
  - Mars rüzgârı: 1,9.

  Son kontrol ettiğim 2 ile 3 puan arasındaki olaylar: son dış yürüyüş (FINAL-EVA), CME varışı, gidiş kararı (OUT-01) ve paketleme (PACK).
- **Dikkat:** Tüm oyuncularda MOON-01'de "kalibre et" en iyi görünüyor (+12 puan), ama rastgele oyuncuda fark yok. Görünen fark, o seçeneği özenli botun seçmesinden geliyor.
- **Hiç seçilmemesi gerekenler** (rastgele oyuncuda kayıp oranı):
  - Su işlemede damıtıcı: %22,7 kayıp. Tayın: %22,6 kayıp.
  - Ay depreminde "görmezden gel": %14,5 kayıp.
  - O₂ acil durumunda yükleri kısmak: %35,9 kayıp.
  - Tıbbi acil durumda "sağlık görevlisi": %68,9 kayıp; bkz. 6.4.

**Hasat çeşitleri:**

| Kart | Görüldüğü oyunlar | Oyun başına |
| --- | --- | --- |
| HARVEST | %86,1 | 1,13 |
| HARVEST-MOLD | %42,1 | 0,48 |
| HARVEST-FEAST | %43,6 | 0,49 |
| HARVEST-SEEDS | %41,4 | 0,47 |

- Rastgele oyuncuda seçimin etkisi küçük: HARVEST 4,5, küflenme 6,2, tohum 5,1, şölen 1,0 puan.
- V3'te "gözlü patatesi yeniden ek" kararı güçlüydü. Artık rastgele oyuncuda fark yok; tüm oyuncularda görülen +16,7 puan oyuncu tipinden geliyor.

**Zorluk:**
- Özenli oyuncu için hedef aralık yaklaşık %60–75.
  - Hedefte dönen özenli bot genelde %58,1: Ay %80–83 (aralığın üstünde), Mars yaz %55,3, Mars bahar %14,2.
  - 30 güne kalan özenli bot: %48,7.
- Rastgele oyuncuda kayıp %13,7 (V3: %10,5); arttı.

## 6. Yeni bulunan hatalar ve denge sorunları

**6.1 "Eve dön"ün sonucu saate bağlı (kritik)**
- Konum:
  - `src/engine/commands.ts:338` (`returnHome`) RETURN-01'i hemen açıyor.
  - `src/engine/rules.ts:52-55`'teki batarya satırı o anki bataryayı ölçüyor.
  - Tahmin ise öğlen ölçüyor: `src/engine/commands.ts:121`.
  - "Bir gün bekle" (`src/engine/events.ts:696-699`) tam 24 saat beklediği için yine aynı saate dönüyor.
- Yeniden üretim:
  1. `realistic({ dest: 'mars', site: 'spring', cargo: { food: 2, filter: 1, battery: 1, parts: 1, seeds: 1 } })` ile 80 seed kur.
  2. MARS-02'de ekonomik modu seç.
  3. Hedef gününe ulaşınca "Eve dön"e 07:00'de bas, sonra aynı oyunları 13:00'te basarak tekrarla.
  4. Sonuç: 07:00'de 26 tam başarı ve ilk kontrolde 71 batarya eksiği; 13:00'te 74 tam başarı ve 2 batarya eksiği.
  5. Mars yazında aynı karşılaştırma 57 / 70 tam başarı.
- Önerilen düzeltme: Dönüş bataryası kalkış saatine göre ölçülsün; ya "bekle" bir sonraki öğlene kadar beklesin, ya kalkış penceresi öğlen olsun. Ayrıca "Eve dön" düğmesinde "batarya şu an yetersiz, X saat sonra yeterli" uyarısı gösterilsin.

**6.2 Hedef, hazırlığı ve kalmayı cezalandırıyor (denge)**
- Konum: `src/engine/outcome.ts:44-45`. Tam başarı yalnız `daysOnSurface ≥ goal.target` koşuluna bakıyor. `goal.target`, `estimateStay` × 0,85 (`src/engine/commands.ts:111-131`).
- Etkileri:
  - Eşya ve uzmanlıkların lift değerleri sıfıra yaklaştı. Levazımcı ve beslenme uzmanı negatife döndü (madde 4.2 ve 4.6).
  - 30 güne kalmak tam başarıyı %58,1'den %48,7'ye düşürüyor.
- Önerilen düzeltme: Hedef, kargodan bağımsız bir temel değerden hesaplansın ya da tahminin yalnız bir kısmı hedefe yansısın. Hedefin üstünde kalmak ve bilim için "üstün başarı" kademesi eklensin.

**6.3 Tıbbi acil durum hâlâ neredeyse kesin kayıp**
- Konum: `src/engine/events.ts:818-870` (EMG-MED). Tetiklenmesi: `src/engine/sim.ts:504`.
- Durum:
  - Görüldüğü 8.524 oyunda tam başarı %0,4.
  - Dengeleme sağlığa +25, suya +20 L, O₂'ye +4 kg ekliyor; ama sağlık düşüşüne yol açan açık genellikle sürüyor.
- Yeniden üretim: Tarama verisinde EMG-MED görülen herhangi bir oyun (`summary_v4.json` → `events` → `EMG-MED`).
- Önerilen düzeltme: Kartta asıl nedeni gösterip çözen bir seçenek eklensin. Örneğin O₂ eksiğinde yaşam desteği onarımı; rastgele oyuncuda en iyi sonuç veren seçenek bu.

**6.4 Tıbbi acil durumda "sağlık görevlisi" seçeneği "dinlen"den bile kötü (şüpheli, doğrulanmadı)**
- Rastgele oyuncuda (n=334): kayıp %68,9. Dinlen %58,7, ilk yardım çantası %32,6.
- Olası neden (yalnız kod okumasıyla): `src/engine/rules.ts:132-140`'daki `availableCrewFor` yalnız `activeEvent.subjects` listesindekileri dışarıda bırakıyor, `subjectCrewId`'yi bırakmıyor. Hasta kişi sağlık görevlisiyse kendini tedaviye atanabiliyor ve 2 saatlik görevde meşgul kalıyor olabilir.
- Doğrulama önerisi: Hasta sağlık görevlisinin olduğu bir kayıtla seçeneği açıp atanabilir kişi listesine bakmak.

**6.5 Takviye ekip çoğu oyunda gelmiyor**
- Konum: `src/engine/events4.ts:98` (`notBeforeDay: 20`).
- Durum:
  - Hedef Ay ekvatorunda medyan 12, Ay kutupta medyan 22.
  - Kabul edilen teklifin %62'sinde ekip inmeden görev bitiyor.
  - Seçimin sonuca etkisi küçük (en çok 3,7 puan).
- Önerilen düzeltme: Teklif yalnız hedef 20. günden sonraysa gelsin, ya da iniş günü hedefe göre ayarlansın.

**6.6 Mobilde (390 px) hız düğmeleri taşıyor**
- E2E kontrolü: `mob-moon-en surface — overflow=7px` FAIL. Kendi denetimimde olay kartı açıkken 1 px.
- Ekran görüntüsünde "16×" sağ kenarda kesik.
- Konum: `src/ui/styles.css:1181` (`.speed`), ayrıca 2824 ve 3616.
- Önerilen düzeltme: Mobilde hız seçimini sarmak ya da kısaltmak (örneğin açılır menü).

**6.7 E2E betiği Windows'ta çalışmıyor**
- Konum:
  - `scripts/e2e.mjs:9`: `new URL('../e2e-screens/', import.meta.url).pathname`, Windows'ta `C:\C:\...%20...` yolunu üretiyor.
  - `scripts/e2e.mjs:12`: `spawn('npx', …)` kabuk olmadan `npx.cmd`'yi bulamıyor.
- Önerilen düzeltme: `fileURLToPath(new URL(…))` ve `spawn(…, { shell: process.platform === 'win32' })`.
- Ayrıca bu makinede Playwright tarayıcısı kurulu değildi. `npx playwright install chromium` gerekti.

**6.8 Bilgi çipleri satır atlayınca sahne kayıyor (küçük)**
- 1440 px'te 6 kişilik ekipte üst bilgi satırına kutup karanlığı, takviye ekip, hedef ve dönüş çipleri birlikte gelince çipler ikinci satıra geçiyor; sahne 31 px aşağı kayıyor.
- Aynı kayıtta takviye ekip indikten sonra çip hâlâ "şimdi · 1 sa kaldı" gösteriyor.
- Önerilen düzeltme: Çip satırına sabit yükseklik vermek ya da çip sayısını sınırlamak; geçmiş olayların çipini kaldırmak.

**6.9 MOXIE ve kalkan hâlâ işlevsiz denge kalemleri**
- MOXIE Mars'ta −2,2 puan, kalkan +0,2 / +0,8 puan.
- Konum: `src/engine/cargo.ts:29` ve `:36`.
- Önerilen düzeltme: MOXIE'nin enerji maliyeti ile O₂ kazancı yeniden ayarlanmalı. Kalkana görünür bir olay rolü verilmeli (CME veya meteor).

## 7. Oyuncuyu tutan ve sıkan anlar (vekil göstergeler)

**Tutanlar:**
- **Geri sayımlı büyük olaylar:** Hazırlık yapılmazsa tam başarı %0,1–1; iki hazırlıkla fırtınada %22, Ay gecesinde %51, meteor yağmurunda %48, kutup karanlığında %57, CME'de %34. Fark kısmen oyuncu tipinden geliyor.
- **"Bunu mümkün kılan" anları:** Oyunların %98'inde, oyun başına 7,3 kez (V3: 8,4).
  - En sık kaynaklar: mekanik, yedek parça, EVA, temizleyici.
  - En nadir: beslenme uzmanı (470), sağlık görevlisi (956), arıtıcı (1.391), haberleşme (2.057). Bunların işe yaradığını oyuncu pek görmüyor.
- **Gerilim:** Tam başarı alan oyunların %53'ünde bir kaynak %20'nin altına düşüyor (V3: %62,5). Buna karşılık sağlık neredeyse ikili kalıyor: kazananların yalnız %0,5'inde sağlık 60'ın altına iniyor.
- **Karar yoğunluğu:** Yüzeyde medyan 26 karar. Oyun başına 27 duraklama (p10 17, p90 37). Kararsız gün %25. Ekip sohbeti medyan 85 satır.

**Sıkanlar:**
- **Etkisi neredeyse olmayan kararlar:** Güç dağıtımı, Mars arama-kurtarma, hasat şöleni, kayadan oksijen, Mars rüzgârı ve toz fırtınası kararı; rastgele oyuncuda fark 2 puandan az.
- **Kaçınılmaz hissettiren acil durumlar:** Tıbbi acil durum geldiğinde sonuç neredeyse belli.
- **Mars'ta saat hatası:** Doğru karar veren oyuncu yanlış saatte döndüğü için "kısıtlı dönüş" alıyor ve nedenini görmüyor.
- **Hedeften sonraki günlerin ödülü yok:** Kalan günler riskli ama sonuç notunda karşılığı yok.

## 8. Önerilen sıradaki işler (en fazla 5)

1. Dönüş bataryası kontrolünü saatten bağımsız yap; "bekle"yi öğlene kadar uzat; "Eve dön"e batarya uyarısı ekle (6.1).
2. Hedef ve sonuç notunu yeniden dengele: kargo hedefi yükseltmesin, hedefin üstünde kalmanın ve bilimin karşılığı olsun (6.2).
3. Tıbbi acil durumda asıl nedeni çözen bir seçenek ekle; "sağlık görevlisi" atamasındaki olası hatayı doğrula (6.3, 6.4).
4. Etkisiz kararları güçlendir (MOON-01, MARS-02, MARS-SAR, ISRU, HARVEST-FEAST); takviye ekibin zamanlamasını hedefe göre ayarla (6.5).
5. Mobil hız düğmesi taşmasını düzelt ve `scripts/e2e.mjs`'i Windows uyumlu yap (6.6, 6.7).

## Ek: arayüz denetimi

- **Komut ve sonuç:**
  - `npm run build` başarılı.
  - `npm run e2e` bu makinede 6.7'deki yol hatası yüzünden başlamadı.
  - Yalnız yolu ve kabuk ayarını düzelten bir kopyası çalıştırıldı: **88/89 kontrol geçti**. Tek hata mobil yüzey ekranındaki 7 px yatay taşma.
- **Ek ölçüm:** Gerçek motor kayıtları (4 kişilik Mars ve Ay, 21. günde 6 kişilik Ay) `localStorage`'a yüklenerek Chromium'da ölçüldü.
- **Olay kartı ve sahne boyutu** (kullanıcının bildirdiği "bug1.png" sorunu):
  - Masaüstünde (1280, 1366, 1440, 1920 px) olay kartı açılınca sahne küçülmüyor. Örneğin 1440 px'te 1100 × 473 px her iki durumda.
  - Mobilde (390 px) sahne 284 px'ten 168 px yüksekliğe iniyor. Bu tasarım tercihi olabilir; `bug1.png` bu makinede olmadığı için kullanıcının gördüğüyle karşılaştıramadım.
- **Altı kişilik ekip:** Sahnede 6 astronot görünüyor, kart kaymıyor. Bilgi çipi satırı kaydırması 6.8'de.
- **Aday ekranı:**
  - 16 aday tek ızgarada.
  - Sağdaki ekip profili `position: sticky`; 1280 ve 1440 px'te kaydırınca üstte sabit kalıyor (203 px'ten 76 px'e).
  - Mobilde profil normal akışta (`position: static`).
- **Görev atama alanı:** 4 kişide 2 × 2, 6 kişide 3 × 2; 1440 ve 390 px'te ölçüldü.
- **Sahnenin yanları:** 1280–1920 px'te sahne sol panelin tamamını kaplıyor, siyah boşluk yok.
- **Sekmeler:** 1280–1920 px'te beş sekme sığıyor (kaydırma genişliği 339 px = görünür genişlik 339 px).
- **Mobil yatay taşma:** Yüzeyde 7 px, olay kartı açıkken 1 px. Kaynak hız düğmeleri (6.6).
