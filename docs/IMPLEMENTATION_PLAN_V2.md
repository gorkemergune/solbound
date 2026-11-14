# Uygulama planı — hikâyeli ilk oynanabilir sürüm

Bu plan eski `BACKLOG.md` kapsamını günceller. Gerçek takım kapasitesi ve teslim saati bilinmediği için saat garantisi verilmez. Bir işi bitirmek yalnız ekran çizmek değil, ilgili kararın sonuç üretmesidir.

## Hedef ve kesme çizgisi

Tam ürün: 30 günlük Ay/Mars kampanyası, gidiş/dönüş bölümleri, 1–2 günlük olay ve gelişen ekip.

İlk dikey kesit: EN/TR → kimlik → iki hedef → 12 adaydan üç kişi → 100V kargo → bir gidiş görevi → hedefe özel üç yüzey günü → dönüş hazırlığı ve iki dönüş kararı → sonuç. Her hedefte üç ana olay + iki küçük olay. Normal mod ve keşif anlatımı veri modeliyle ayrılır. Kısa demo uzun kampanyayı tamamladığı iddiası taşımaz.

İlk kalite odağı: hazırlıkların gerçek etkisi, görsel bağ, anlaşılır karar, düzgün kayıt. P1: geniş 30 günlük içerik, alternatif karar karşılaştırması, derin karakter ilişkileri. P2: runtime LLM, sınıf paneli, çok oyunculu ve PWA.

## İş paketleri

| ID | İş | Bağımlılık | Tamamlanma kanıtı |
| --- | --- | --- | --- |
| V2-01 | Mevcut repo incelemesi, kısa uygulama planı, paket seçimleri | Güncel belgeler | Kullanıcı dosyaları korunur; `docs/IMPLEMENTATION_NOTES.md` içinde plan/varsayımlar |
| V2-02 | Scaffold, görsel temel, EN/TR ve durum makinesi | V2-01 | Çalışan giriş; dil değişimi; typecheck/build |
| V2-03 | Seed'li karakter ve ekip seçimi | V2-02 | 12 aday; 3 seçim; isim düzenleme; geri dönmede tutarlılık |
| V2-04 | Hedef ve 100V hazırlık | V2-03 | Ay/Mars farklı brifing; kapasite sınırı; eşya etkileri |
| V2-05 | Motor, saat adaptörü, kayıt | Domain sözleşmesi | Aynı seed/komut aynı sonuç; gizli sekme durur; kayıt aynı aşamaya döner |
| V2-06 | Üs sahnesi ve ilk tam kriz | V2-04, V2-05 | Kaynaklar ve görsel durum gerçek motor sonucu ile değişir |
| V2-07 | Ay/Mars olay setleri ve NASA kartları | V2-06 | İki hedefe özgü içerik; kaynaklı araştırma; ana/küçük olaylar |
| V2-08 | Gidiş, dönüş rezervleri ve dönüş görevleri | V2-07 | Hazırlık veya önceki hasar dönüşte seçenek değiştirir |
| V2-09 | Sonuç, kayıp/keşif anlatımı, yeniden deneme | V2-08 | Nedeni açıklanan başarı/kısmi başarı/kayıp; tekrar akışı |
| V2-10 | Denge, görsel inceleme ve çekirdek E2E | V2-09 | Aşağıdaki kabul kapıları; gerçek test sonuçları |

İskelet hazır olur olmaz ekranla motoru birleştir; bütün arayüzü sahte verilerle tamamlayıp entegrasyonu sona bırakma. Önce bir olay uçtan uca, sonra içerik genişletme.

## Gerekli davranış kontrolleri

- Dil seçimi bütün metinleri etkiler ve oyun durumunu değiştirmez.
- İsimsiz karakter/aday otomatik isim alır; yeniden render/geri dönüş yetenek değiştirmez.
- Tam üç benzersiz arkadaş olmadan kalkış olmaz. Oyuncuyla toplam dört kişi vardır.
- 100V eşitliği geçerli; 100V üstü, negatif miktar ve stoktan fazla kullanım reddedilir.
- Ay ve Mars farklı en az bir fiziksel/operasyonel kısıt ve olay seti gösterir.
- Seçilen kişi veya yük en az iki olayda seçenek/sonuç üzerinde etkili olur.
- Saat/duraklama görünür; büyük zaman adımı olayları atlamaz. Aynı olay/karar yalnız bir kez uygulanır.
- Araştırma kartı kaynağı, kapsamı ve oyundaki etkisini gösterir; oyun sayısını NASA sayısı gibi göstermez.
- Eksilen kaynak, biten görev, arıza ve ekip durumu günlüğe motorun nedeni ile yazılır.
- Sağlık/risk uyarısının ardından müdahale olanağı vardır; kayıp durumu kurallı ve grafik olmayan biçimde anlatılır.
- Gidiş ve dönüş görevleri çalışır; yalnız “geri döndünüz” ekranına atlanmaz.
- Kayıt yenilemede hazırlığı, görevleri, açık olayı, PRNG'yi ve aşamayı korur; bozuk kayıt çökertmez.
- En az bir başarılı politika, bir zorlu/kısmi sonuç ve açıklanabilir başarısız politika deterministik fixture ile denenir; tek baskın eşya/ekip seti denge sorunu olarak not edilir.

## Test ve teslim

Motor/komut testleri önce bütçe, deterministik sonuç, zaman eşikleri ve muhasebe risklerine odaklanır. E2E yeni görevden sonuca kadar kısa demo oynar; Ay ve Mars farkını, TR/EN'yi ve kayıt yüklemeyi kontrol eder. Uygun araç varsa masaüstü/mobil ekran görüntüleri incelenir.

Teslimde: çalıştırma komutları, oynanabilir kapsam, gerçek kontrol sonuçları, bilinen eksikler, kullanılan kaynaklar ve sonraki üç iş. Kullanıcı istemedikçe commit/push/yayın yapılmaz. Model veya araç sınırı nedeniyle yapılamayan kontrol “geçti” yazılmaz.
