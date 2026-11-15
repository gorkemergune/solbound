> Tarihsel v0.1 önerisi. Güncel kapsam için [v0.2 başlangıç belgesini](00_START_HERE.md) okuyun. Bu dosyadaki 12-sol, yalnız Mars, yalnız tur onayı veya araştırma-only kapsamı güncel gereksinim değildir. Bilimsel/teknik ayrıntılar güncel belgelerle birlikte değerlendirilir.

# Ürün ve oyun tasarımı

## Ana fikir

**Solbound:** Öğrenci bir Mars üssünün komutanıdır. Başarı yalnızca kaynak biriktirmek değil, birbirine bağımlı sistemleri dengede tutmaktır. Her kararın kısa vadeli faydası ve başka bir sistem üzerinde maliyeti vardır.

Hedef yaş başlangıç varsayımı 12–16; ilk görev 5–8 dakika ve 12 sol. Takımın gerçek teslim saatine göre kapsam yeniden kesilir. İlk prototipin amacı mühendislik ödünleşimini hissettirmek, gerçek bir Mars görevinin sayısal doğruluğunu iddia etmek değildir.

## Öğrenme hedefleri

| Hedef | Oyundaki karar | Öğrenmenin kanıtı |
| --- | --- | --- |
| Sistem bağımlılıkları | Seraya enerji ayırırken yaşam desteğini korumak | Oyuncu enerji kesintisinin oksijene etkisini açıklayabilir |
| Dayanıklılık ve yedeklilik | Daha çok panel veya daha büyük batarya | Aynı fırtına karşısında farklı stratejileri karşılaştırabilir |
| Kısıtlı kaynak bütçesi | Bakım veya sığınak inşasına ekip zamanı ayırmak | Bir kazanımın fırsat maliyetini söyleyebilir |
| Belirsizlik altında planlama | Radyasyon uyarısında ekibi sığınağa almak | Tahmin ile kesin sonuç arasındaki farkı fark eder |
| Kısa ve uzun vadeli sonuçlar | Stok gıda tüketmek veya bitki yetiştirmek | Gecikmeli üretimin neden başlangıç stoku gerektirdiğini anlar |

## Çekirdek döngü

**Gözlemle → planla → önizle → solu ilerlet → sonucu açıkla → yeniden dene.**

Başlangıçta hazır ve çalışır bir üs verilir. Oyuncu önce bir enerji kararını öğrenir; ardından bakım, gıda ve koruma açılır. Tam bir üs kurma editörü MVP'yi gereksiz büyütür.

Bir turda oyuncu sistemlerin çalışma seviyesini seçer; örneğin kapalı, ekonomik, tam. Seçeneklerin toplam güç gereksinimi ve ekip iş yükü görünür. Bütçeyi aşan kararlar açıklayıcı mesajla reddedilir. Kritik yaşam desteğini kapatmak mümkünse sonuç açıkça gösterilir ve tur onayı oyuncudadır.

## Ekranlar

1. **Görev brifingi:** Amaç, ekip ve başlangıç koşulları; 30–45 saniyelik etkileşimli öğretici.
2. **Üs görünümü:** Merkezde etkileşimli 2D/SVG üs; yan panelde seçili modül ve kararlar.
3. **Kaynak şeridi:** Enerji üretimi/talebi, batarya, O₂, su, gıda ve ekip sağlığı. Değerin yanında değişim nedeni ve kalan tur tahmini.
4. **Olay kartı:** Ne biliniyor, ne belirsiz, hangi seçenekler var?
5. **Görev özeti:** Hayatta kalma, dayanıklılık ve üç açıklanmış karar; aynı başlangıçla yeniden deneme.

Önemli bilgi yalnızca renk ile verilmez. Klavye ile oynanabilirlik, azaltılmış hareket, okunabilir metin ve dokunma alanları temel gereksinimdir. Başarısızlıkta grafik ölüm yerine görevin güvenlik nedeniyle sonlandırılması anlatılır.

## Başarı ve başarısızlık

- Başarı: 12. sol sonunda ekip sağlığı pozitif ve üs görev sonlandırma durumuna girmemiştir.
- Başarısızlık: Tanımlı sağlık/yaşam desteği toleransı aşıldığında görev sonlandırılır. Tek tur sıfır stok otomatik ölüm değildir; toleranslar senaryoda açıklanır.
- Sağlık, akut oksijen yetersizliği ve gıda/su eksikliğini ayrı nedenlerle raporlar. Radyasyon birikimi ayrı risk göstergesidir; akut olaylar ve uzun vadeli risk eşdeğer gösterilmez.
- Tek gizli puan yerine kaynak rezervleri, bakım durumu ve karar açıklamaları görünür. Öğrenme kartları puan için ezber gerektirmez.

## Ödünleşim örnekleri

| Karar | Kazanç | Bedel |
| --- | --- | --- |
| Sera ışıklarını artır | Daha hızlı büyüme | Daha yüksek enerji ve su gereksinimi |
| Sığınak inşa et | Olay sırasında daha düşük radyasyon riski | Malzeme ve ekip zamanı |
| Panel temizle | Kaybedilen güneş üretimini kısmen geri kazan | Dış görev süresi ve risk |
| Bakımı ertele | Bu tur daha fazla bilim/üretim | Daha düşük güvenilirlik |
| Batarya kur | Gelecekte daha fazla depolama | Kurulum maliyeti; kendisi enerji üretmez |

## Jüri demosu: 3 dakika

İlk 30 saniye: problem ve hedef öğrenci. Sonraki 60 saniye: sabit tohumlu fırtına senaryosunda bir karar. Sonraki 45 saniye: aynı başlangıçla alternatif karar ve farklı kaynak sonucu. Son 45 saniye: neden-sonuç açıklaması, NASA kaynak kartı ve öğrenme çıktısı.

MVP dışı: iki gezegenin aynı anda dengelenmesi, gerçek zamanlı çok oyunculu mod, 3D fizik, hesap sistemi, öğretmen paneli, canlı uzay hava durumu, üretken AI anlatıcı, kapsamlı teknoloji ağacı.
