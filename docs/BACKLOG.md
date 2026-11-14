# Hackathon yapılacaklar listesi

Plan varsayımı: yaklaşık 24 saatlik geliştirme penceresi ve paralel ilerleyebilen ekip. Etkinlik takvimi doğrulanmadığı için bu bir teslim tarihi sözü değildir. Tahminler kişi-saat; toplam süreye QA ve entegrasyon payı eklenir. Takım küçükse P1 kesilir, P0 bitirilir.

## Öncelik ve kilometre taşları

- **P0:** Jürinin oynayabileceği uçtan uca çekirdek.
- **P1:** Öğrenmeyi ve sunumu güçlendiren işler.
- **P2:** Hackathon sonrası genişleme.
- **M0 / ilk 1–2 saat:** ürün kapsamı, veri sözleşmesi, repo ve görev dağılımı.
- **M1 / yaklaşık 2–8 saat:** ekransız motor + temel arayüz.
- **M2 / yaklaşık 8–16 saat:** entegre oynanış, olay ve açıklamalar.
- **M3 / yaklaşık 16–24 saat:** dengeleme, erişilebilirlik, demo ve dağıtım.

## P0 — oynanabilir ilk sürüm

| ID | İş | Rol | Tahmin | Bağımlılık | Kabul kriteri |
| --- | --- | --- | --- | --- | --- |
| SB-001 | Repo adı/sahibi, erişim, gerçek son teslim ve lisans kararını netleştir | Koordinasyon | 0.5–1 | Yok | Repo URL'si ve teslim saati kaydedildi; erişim doğrulandı |
| SB-002 | Claude keşif raporu ve kapsam incelemesi | Araştırma | 1–2 | Görev metni hazır | Kaynaklı bulgular, belirsizlikler, MVP kesme önerileri var |
| SB-003 | 12-sol senaryo, birimler ve denge parametrelerini tanımla | Oyun/motor | 1–2 | Ürün brifi | Her katsayının birimi ve kaynak/oyun varsayımı etiketi var |
| SB-004 | React/TS/Vite iskeleti ve temel kontrol komutları | Arayüz | 0.5–1 | SB-001 adı; yerelde erişim beklemez | Dev ve production build açılıyor; lockfile ve typecheck var |
| SB-005 | Domain tipleri ve senaryo doğrulaması | Motor | 1–1.5 | SB-003 | Hatalı senaryo birim/alan hatalarıyla reddediliyor |
| SB-006 | Saf tur motoru, enerji ve stok muhasebesi | Motor | 3–4 | SB-005 | Üretim/tüketim, kapasite ve sağlık kuralları deterministik |
| SB-007 | Kritik motor testleri ve üç politika fixture'ı | Motor/QA | 1.5–2 | SB-006 | İki başarılı ve bir başarısız politika; muhasebe ve seed testleri geçiyor |
| SB-008 | Üs görünümü, kaynak şeridi ve karar paneli | Arayüz | 3–4 | SB-004, SB-005 | Altı modül seçilebiliyor, klavye ile karar verilebiliyor |
| SB-009 | Draft/preview/commit entegrasyonu | Arayüz/motor | 1.5–2 | SB-006, SB-008 | Tek tık bir tur ilerletiyor; önizleme state'i değiştirmiyor |
| SB-010 | Toz fırtınası, arıza, parçacık olayı | Oyun/motor | 1.5–2 | SB-006 | Üç olayın farklı sonucu ve görünür nedeni var |
| SB-011 | Kısa öğretici ve nedensel açıklamalar | İçerik/arayüz | 1–2 | SB-009, SB-010 | İlk karar yönlendiriliyor; her tur ana değişim nedeni görünüyor |
| SB-012 | Görev sonucu, güvenli sonlandırma ve aynı seed ile yeniden başlat | Arayüz/motor | 1–1.5 | SB-007, SB-011 | Başarı/başarısızlık ekranı ve tekrar akışı çalışıyor |
| SB-013 | Yerel kayıt, yükleme ve bozuk kayıt davranışı | Arayüz | 0.5–1 | SB-009 | Yenilemede görev sürüyor; bozuk kayıt çökertmiyor |
| SB-014 | E2E, klavye ve görünüm doğrulaması | QA | 1–2 | SB-012, SB-013 | Çekirdek akış geçiyor; bilgi yalnız renge bağlı değil |
| SB-015 | Statik yayın, 3 dakikalık demo ve teslim paketini hazırla | Koordinasyon | 1–2 | SB-014 | Canlı URL başka cihazdan açılıyor; sabit demo seed'i ve video yedeği var |

P0 toplamı yaklaşık **20–32 kişi-saat**; entegrasyon ve bilinmeyenler için ayrıca yaklaşık %25 pay ayırın. Her işi tek kişinin sırayla yapması 24 saatlik pencereye sığmayabilir.

## P1 — çekirdek çalıştıktan sonra

- [ ] **SB-016:** Karar sonrası alternatif seçeneği aynı bilinen koşullarla karşılaştır; gizli olay veya sonradan kazanılan bilgiyi avantaj sayma.
- [ ] **SB-017:** Kaynak defteri ve NASA referans kartları; her sayısal iddiayı kaynak/varsayım etiketiyle göster.
- [ ] **SB-018:** Türkçe metin seti ve dil seçimi; metinler bileşenlere gömülü olmasın.
- [ ] **SB-019:** Hafif görsel efektler, ses aç/kapa ve azaltılmış hareket desteği.
- [ ] **SB-020:** Üç kısa öğrenme sorusu; en az üç kullanıcıyla gözlem ve anonim takım notu.
- [ ] **SB-021:** Çekirdek kontroller için GitHub Actions; E2E maliyetini teslim süresine göre ayarla.

## P2 — sonraki sürümler

- [ ] Ay senaryosu: aydınlanma/konum ve gece koşullarına göre ayrı veri seti; Mars katsayılarını yeniden etiketlemek yetmez.
- [ ] Öğretmen senaryo editörü ve sınıf içi karşılaştırma.
- [ ] JSON kayıt paylaşımı ve görev tekrar oynatımı.
- [ ] PWA çevrimdışı ilk yükleme ve kurulum.
- [ ] Basitleştirilmiş ISRU, modül yerleşimi, daha uzun görevler.
- [ ] Kullanıcı testi doğrularsa AI rehber; motorun otoritesini değiştirmeden, kaynaklı ve isteğe bağlı.

## İş akışı

Araştırma/oyun tasarımı, motor, arayüz ve QA/sunum iş kolları veri sözleşmesi üzerinde anlaşır. Bunlar insan ekip rolleri için öneridir; otomatik ajanlar başlatılmış değildir. GitHub erişimi sonrası SB kimlikleri issue başlıklarına taşınır; durumlar `Todo`, `In progress`, `Review`, `Done` olur.

Her görev tamamlandığında kod veya belge, kabul kriteri kanıtı ve varsa bilinen sınır kaydedilir. İlk entegrasyondan sonra kapsam büyütmek yerine oynanabilir akış korunur. T−4 saatten itibaren yalnız hata düzeltme, denge ve teslim işleri alınır; T gerçek teslim saatidir.
