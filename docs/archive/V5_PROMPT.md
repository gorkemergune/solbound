# V5 test görevi (Claude için hazır prompt)

Aşağıdaki metni olduğu gibi diğer bilgisayardaki yeni bir Claude Code oturumuna verin. Önce depoyu güncelleyin (`git pull`). Oturum kaynak kodu değiştirmemeli ve sonuçları iki dosyaya yazmalıdır.

---

Solbound’un **v0.8 (`0.8.0-landing`)** sürümünü test et. Önce `CLAUDE.md`, `docs/CURRENT_STATE.md`, `README.md` ve `docs/IMPLEMENTATION_NOTES.md` dosyasındaki v0.8 bölümünü oku.

Bu, sunumdan önceki son test. İki amacı var:

1. Ürünün; yani canlı sitenin, tanıtım videosunun ve deponun, aşağıdaki **NASA Space Apps mentör değerlendirme formuna** göre puanlanması.
2. v0.8’in hatasız çalıştığının doğrulanması.

Önceki test `docs/archive/V4_TEST.md` ve `docs/archive/summary_v4.json` dosyalarında. Sonuçları V4 ile yan yana karşılaştır.

Test edilecekler:

- Canlı uygulama: https://solbound.vercel.app
- Tanıtım videosu (30 sn): https://www.youtube.com/watch?v=k4y-1OFfU08 (yerel kopya: `docs/media/solbound-trailer.mp4`)
- Depo: bu klasör

## Kurallar

- Kaynak koda, testlere ve belgelere dokunma. Yalnız iki çıktı dosyası yaz:
  - `docs/archive/V5_TEST.md` (Türkçe rapor)
  - `docs/archive/summary_v5.json` (tablolar ve puanlar)
- Uydurma sayı yazma. Her sayı senin koşturduğun bir oyundan, ölçümden ya da komuttan gelsin. Denemediğin bir şeyi “çalışıyor” diye yazma; “denenmedi” de.
- Bu bilgisayarda `.env` ve NASA anahtarı yok. `npm run donki:snapshot` çalıştırma; gerekmiyor.
- İşletim sistemini, tarayıcıları ve sürümlerini raporun başına yaz. Windows’taysan bu, e2e’nin Windows düzeltmesinin ilk denemesi; sonucu ayrıca belirt.
- Puan verirken kibar olma: gerçek bir mentör gibi değerlendir. Her puanın yanına kanıtını yaz (ekran, dosya, satır, ölçüm).

## Bölüm A: Mentör formuna göre puanlama

Form, her ölçütü 1–5 puanla değerlendiriyor (toplam 25). 5 puanın tanımları formdan aktarılmıştır:

| Ölçüt | Ne değerlendiriliyor | 5 puan tanımı |
| --- | --- | --- |
| **Etki** | Projenin ele aldığı sorun; sorunun niteliği ve büyüklüğü; ilham verme ve yardım düzeyi; ulaştığı kitle | Önemli bir sorunu ele alarak olağanüstü bir etki yaratır. Erişimi geniştir; ilham verir, büyük bir kitleye fayda sağlar. Kalitesi ve etkililiği beklentilerin çok ötesindedir. |
| **Yaratıcılık** | Özgünlük ve yenilik; yeni bir kavram ya da mevcut fikirleri anlamlı biçimde geliştirmek | Daha önce denenmemiş, çığır açıcı bir yaklaşım. Geleneksel yöntemleri sorgulayan, özgün bir çözüm. |
| **Geçerlilik** | Bilimsel ilkelere dayanma; teknik, işlevsel ve mantıksal uygulanabilirlik; tamamlanmışlık; kullanılabilirlik, kullanıcı dostu olma, pratiklik ve erişilebilirlik; geliştirme, uygulama ve işletme maliyetleri; kaynak ve finansman; ekonomik sürdürülebilirlik; ütopik maliyet varsayımı olmaması | Bilimsel açıdan sağlam, teknik açıdan uygulanabilir. Tamamen geliştirilmiş, gerçek yaşamda uygulanmaya hazır. Son derece kullanılabilir ve erişilebilir. Maliyetler gerçekçi varsayımlarla değerlendirilmiş, finansmanı sağlanabilir ve ekonomik olarak sürdürülebilir. |
| **İlgililik** | Başvurulan problem başlığını tam ve doğrudan ele alma; NASA verilerini yüzeysel bir ek olarak değil, çözümün temel bileşeni olarak kullanma | Problem başlığını kapsamlı biçimde ele alır. NASA verileri projenin ayrılmaz bir parçasıdır ve yeniliği ileriye taşıyan içgörüler sağlar. |
| **Sunum** | Problemin, çözümün ve öneminin açıkça aktarılması; hikâyeleştirme; sunumun açıklığı ve düzeni. Mentörler proje gösterimini ve projenin tamamını değerlendirir. | Problem, çözüm ve önem açıkça ifade edilmiş; ilgi çekici, iyi yapılandırılmış ve ikna edici bir sunum. |

Yarışma problemi (resmî metin):

> Space-themed STEM content often oversimplifies the engineering trade-offs that define a real mission or presents them at a level too complex to hold a young learner's attention. Few tools make those trade-offs both tangible and fun. Your challenge is to design and build an interactive game or app that lets students run a lunar or Martian outpost, balancing competing demands like life support, radiation shielding, power, and food production, so they experience firsthand the decisions that determine whether a mission fails or succeeds.

Ayrıntı için `docs/MAIN.md` dosyasının ilk paragrafına da bak. Problem özetle şunu istiyor:

- Öğrenci, bir Ay ya da Mars üssünü yönetirken mühendislik kararlarının bedelini deneyimlemeli.
- Yaşam desteği, enerji, gıda ve radyasyon koruması ele alınmalı.
- Oyuncu, kararının neden işe yaradığını anlamalı.

Her ölçüt için şunları yaz:

1. **Puan (1–5)** ve tek cümlelik gerekçe.
2. **Kanıt:** uygulamada, videoda ya da depoda nerede görülüyor?
3. **Eksik:** 5 puanı engelleyen şey ne?
4. **En ucuz iyileştirme:** sunuma kadar yapılabilecek, puanı en çok yükseltecek tek iş. Kod mu, belge mi, sunum mu olduğunu ve tahmini süresini yaz.

Özellikle kontrol et:

- **Etki:** Hedef kitle (öğrenciler) ilk dakikada ne yapacağını anlıyor mu? “Nasıl oynanır” penceresi ve ilk karar yeterli mi? Telefonda oynanabiliyor mu? Bir öğretmen bunu derste nasıl kullanır, kullanabilir mi?
- **Yaratıcılık:** Benzer oyunlardan (koloni ya da üs yönetimi oyunları, NASA eğitim oyunları) ayıran özellik ne? Bunlar oyunda gerçekten hissediliyor mu?
  - Gerçek DONKI olayları, oyunda aynı günlerde yaşanıyor.
  - Gerçek sinyal gecikmesi.
  - Rastgele iniş yeri.
  - Geri sayımlı olaylar.
  - Özet filmi.
- **Geçerlilik:**
  - 31 araştırma kartındaki 25 NASA/JPL kaynağından en az 8’ini aç; kaynaklar oyundaki iddiayı gerçekten destekliyor mu?
  - Oyun varsayımları açıkça ayrılmış mı?
  - README’deki “Cost and sustainability” bölümü doğru ve yeterli mi?
  - Erişilebilirlik: klavyeyle oynanabilirlik, kontrast, ekran okuyucu etiketleri, `prefers-reduced-motion`. Tarayıcı aracıyla ölçebildiğin kadarını ölç.
- **İlgililik:**
  - Başlıktaki dört sistemin her biri oyunda bir karar olarak görünüyor mu?
  - NASA verisi süs mü, yoksa oynanışı değiştiriyor mu? Oyunun DONKI verisiyle ve verisiz oynandığı durumda sonuç farkını Bölüm D’deki taramadan ölç.
- **Sunum:**
  - Video 30 saniyeyi aşıyor mu?
  - Problemi, çözümü ve NASA verisini anlatıyor mu?
  - Video, oyunun şu anki hâliyle uyumlu mu? Örneğin artık kaldırılan iniş yeri seçimini gösteriyor mu?
  - README ilk bakışta ne olduğunu anlatıyor mu?
  - “Yapanlar” penceresi dolu mu?

## Bölüm B: Canlı site testi (https://solbound.vercel.app)

Tarayıcı aracıyla gerçek bir oyuncu gibi oyna. Raporda her oyunun seed’ini, hedefini, iniş yerini ve sonucunu yaz.

- **4 tam oyun**, 16× hızda:
  - Ay TR
  - Ay EN
  - Mars TR
  - Mars EN
  - En az birinde erken “Eve dön” kullan; en az birinde 30. güne kadar kal.
- Bu bilgisayarda bulunan **her masaüstü tarayıcıda** (Chrome, Edge, Firefox…) en az bir oyunun ilk 3 günü ve özet ekranı.
- **Mobil:** 390 × 844 ve 360 × 740 boyutlarında tam bir akış: başlık, hazırlık, görev ve özet. Yatay taşma, kesilen düğme, okunamayan yazı var mı?
- **Ölç:**
  - İlk açılış süresi (soğuk önbellek).
  - Aktarılan toplam veri.
  - Konsol hataları ve uyarıları.
  - Başarısız ağ istekleri.
- **DONKI:**
  - Brifingteki uzay havası kartı veri kaynağını doğru söylüyor mu: canlı, kısmen güncel, örnek?
  - `https://solbound.vercel.app/donki-latest.json` içindeki `fetchedAt` tarihi ne? 2 günden eskiyse “GitHub Action çalışmıyor olabilir” diye yaz.
  - Oyundaki CME olayının tarihi ve hızı bu dosyadaki kayıtla eşleşiyor mu? Bir örnekle doğrula.
- **Anahtar güvenliği:** canlı sitedeki bütün `assets/*.js` dosyalarını indir. `api_key=` ve 40 karakterlik anahtar benzeri dizgileri ara; yalnız `DEMO_KEY` olmalı. Bulduğun bir anahtarı rapora **yazma**; yalnız var ya da yok de.
- **Özet filmi:** video indiriliyor ve oynatılıyor mu? Yüzler oyundaki portrelerle aynı mı? PNG kart ve “kopyala” çalışıyor mu?
- **v0.8 değişiklikleri:**
  - Rastgele iniş ve iniş ekranındaki yer kartı.
  - Kalkıştan önce tahmin aralığı.
  - 13:00 kalkış penceresi.
  - “Tahminin ötesinde” derecesi.
  - Stres 98’de ekip krizi kartı.
  - Fırtınadan sonra sığınaktan çıkış.
  - Brifingteki DONKI açıklaması.
  - Yapanlar penceresi.
  - Zaman şeridinden “Neden iki saat?” düğmesinin kaldırılmış olması.

  Her biri için “çalışıyor / sorunlu / görülmedi” yaz.

## Bölüm C: Depo

1. `npm ci`, `npm run typecheck`, `npm test`, `npm run build`. Süreleri ve sonuçları yaz.
2. `npm run e2e:short`, ardından tam `npm run e2e`. Windows’taysan, takılırsa ya da hata verirse çıktıyı aynen yaz. `e2e-screens/` altındaki ekran görüntülerini de incele.
3. `README.md` ve `docs/README.md` içindeki bütün bağlantılar açılıyor mu? README’deki iddiaların her biri kodla doğrulanabiliyor mu? Doğrulanamayanı listele.

## Bölüm D: Denge taraması (v0.8, V4’ten küçük)

V4’teki yöntemi kullan:

- Gerçek motor ve `applyCommand`.
- Gerçek kütle bütçesi.
- Ana taramada `realistic()` ve `playLaunched()`. `prepared()` ve `launchAnyway()` kütle kontrolünü atladığı için ana taramada kullanılmaz.
- Bellek için 5.000 oyunluk parçalar.

Hedef **en az 16.000 oyun**: 16 iniş yerinin her biri için en az 1.000. Zaman yetmezse kaç oyunla durduğunu yaz.

- Eksenler:
  - Hedef: Ay ya da Mars (iniş yeri rastgele, ama yer başına eşit örnekle).
  - Ekip: rastgele 3 kişi.
  - Kargo: boş / az / rastgele / dolu.
  - Mod.
  - DONKI anlık görüntüsüyle ya da onsuz.
  - Oyuncu tipleri: özenli, karışık, rastgele, pervasız, erken dönen.
- Sorular:
  1. **İniş yeri zorluk etiketleri** (kolay / orta / zor / çok zor) gerçek sonuçlarla uyuşuyor mu? Yer başına özenli oyuncunun başarı ve “tahminin ötesinde” payı ile rastgele oyuncunun kayıp payını tablo yap. Etiketi yanlış görünen yerleri ve önerilen etiketi yaz. Etiketler `src/engine/landing.ts` dosyasında.
  2. **Tahmin aralığı** (`estimateRange`): inişten sonraki kesin tahmin her zaman aralığın içinde mi?
  3. **Kalkış penceresi:** “Eve dön”den sonra 13:00’e kadar beklerken ölen ya da hedefi kaçıran oyun var mı?
  4. **Stres ve kriz:** CREW-CRISIS kaç oyunda açılıyor? Seçeneklere göre sonuç ne?
  5. **EMG-MED `treatCause`:** baskın mı, gereksiz mi?
  6. **DONKI etkisi:** verili ve verisiz oyunlar arasında sonuç farkı. Bu, Bölüm A’daki İlgililik kanıtıdır.
  7. **Genel denge:** özenli oyuncu için hedef aralık yaklaşık %60–75 tam başarı (başarı + tahminin ötesinde). V4 ile karşılaştır.

## Rapor biçimi (`docs/archive/V5_TEST.md`)

1. **Kısa özet:** toplam puan (25 üzerinden), sunuma engel olan hata var mı (evet ya da hayır), en önemli 3 sonuç.
2. **Ortam:** işletim sistemi, tarayıcılar, Node sürümü, tarih.
3. **Mentör puanlaması:** beş ölçütün tablosu (puan, kanıt, eksik, en ucuz iyileştirme), ardından mentörün yazabileceği 3–4 cümlelik “genel değerlendirme ve geri bildirim” metni.
4. **Canlı site sonuçları:** oyunlar, tarayıcılar, mobil, ölçümler, DONKI, anahtar, özet filmi, v0.8 kontrol listesi.
5. **Depo sonuçları:** typecheck, test, build ve e2e.
6. **Denge taraması:** yöntem, sınırlar, tablolar, V4 karşılaştırması.
7. **Hatalar:** önem sırasına göre. Her biri için dosya ve satır, nasıl yeniden üretileceği ve önerilen düzeltme. “Sunumdan önce mutlaka” ve “sonra” diye ikiye ayır.
8. **Sunum için öneriler:** en fazla 5 madde. Jüriye gösterilecek en etkileyici 60 saniyelik oyun akışı, hangi seed ve hangi yer.

`docs/archive/summary_v5.json` içinde şunlar olsun:

- `rubric`: beş ölçütün puanı ve toplam.
- `live`: oyunlar ve ölçümler.
- `repo`: komut sonuçları.
- `balance`: tablolar.
- `bugs`: liste.
