# Görsel yön ve etkileşim kalitesi

## Referansın kullanımı

[1in8b.life](https://1in8b.life/) kişisel başlangıç, zamanın görünürlüğü ve biriken yaşam kaydı bakımından referanstır. Kaynak arayüzü, metinleri, illüstrasyonları veya verileri kopyalanmaz. Solbound kendi uzay sahneleri, karakterleri ve hikâye diliyle tasarlanır. Bu belge tasarım yönüdür; hazırlanmış görsel varlık beyanı değildir.

## Hedef his

**Küçük bir ekibin büyük bir boşluktaki yolculuğu.** Sinematik ama okunabilir; sıcak insan ayrıntıları ve ölçülü teknik göstergeler. Uzun genel kart listeleri yerine merkezde karakter veya üs sahnesi; karar sırasında odaklı panel.

- Arka plan: derin lacivert/koyu kömür; metin: kırık beyaz. Mars için bakır/toprak, Ay için taş grisi; ortak sıcak amber vurgu.
- Başlıklarda karakterli bir yazı tipi; gövde metninde okunaklı sade font. Yüksek gecikme yaratmayan yerel/font fallback seçenekleri.
- Özgün SVG portreler ve karakter ID'sinden gelen tutarlı yüz/aksesuar ayrıntıları. Aynı portre bütün ekranlarda korunur.
- Üs modülleri tıklanabilir ve işlevi görünür: ışıkları kısılan sera, doluluğu değişen batarya, çalışan hava sistemi.
- Hareket kısa ve anlamlı: kalkış, görev tamamlama, enerji akışı. Azaltılmış hareket tercihi; yanıp sönen alarm yok.
- Ses isteğe bağlı; görsel ve metinsel karşılığı olmadan önemli bilgi verilmez.

## Ekran kompozisyonları

| Ekran | Ana görsel | Etkileşim odağı |
| --- | --- | --- |
| Giriş | Gezegen ufku ve küçük gemi | EN/TR ve göreve başla |
| Kimlik | Büyük astronot portresi ve görev kartı | İsim, geçmiş, üç yetenek |
| Hedef | Yan yana Ay/Mars manzaraları | Hedef farkını anlamak |
| Ekip | Portre ızgarası + dört koltuk şeridi | Üç arkadaş seçmek |
| Yük | Gemi kesiti veya yük ızgarası | 100V ve vazgeçilen malzeme |
| Yolculuk | Gemi/rota sahnesi | Kısa görev kartı |
| Üs | Merkezde 2D üs; küçük çalışan astronotlar | Modül, ekip görevi, araştırma |
| Sonuç | Ekibin son hâli + kısa görev zaman çizgisi | Eve dönüş ve kararların anlamı |

Masaüstünde üç bölge: ince kaynak/saat şeridi, baskın sahne, dar ekip/günlük bölgesi. Olay kartı sahneyi tamamen ilgisiz bir sayfaya dönüştürmez. Tablet ve telefonda paneller sekme/çekmeceye dönüşür; yatay taşma olmaz.

## Gerekli özgün varlıklar

İlk aşamada kodla üretilebilir SVG yeterli: uzay gemisi, Ay/Mars yüzeyi, altı üs modülü, astronot portre sistemi, eşya ikonları, üç kriz illüstrasyonu. Harici varlık kullanılırsa kaynak/lisans kaydı gerekir. Eksik dosya adresleri, emojiyle doldurulmuş sahne veya yalnız boş placeholder sunulmaz.

## Okunabilirlik ve yerelleştirme

- Her barın etiketi, değeri ve anlamı var; kırmızı/yeşil tek başına bilgi taşımaz.
- Hover ayrıntısının tıklama, dokunma ve klavye eşdeğeri var. Modal odağı ve kapatma davranışı tutarlı.
- TR/EN ilk sürümün bütün akışında çalışır. Çeviri yalnız butonlarla sınırlı değildir: olay, araştırma, hata, günlük ve sonuç da çevrilir.
- Türkçe uzun metinler için esnek düzen; string birleştirme yerine parametreli çeviri. Sayılar dile göre biçimlenir.
- “100V / 100V”, seçili kişi sayısı, aktif görev ve duraklama durumu açıkça görünür.

## Görsel kabul ölçütleri

En az 1440×900 masaüstü ve yaklaşık 390×844 mobil görünümde ilk akış, ekip, kargo, üs ve sonuç ekranları incelenir. Taşma, okunmayan etiket, erişilemeyen buton ve eksik görsel düzeltilir. Ekran görüntüsü alma aracı yoksa kontrol yapılmış gibi raporlanmaz; kalan manuel kontroller listelenir.

Başarı ölçütü: oyuncu ilk bakışta nerede olduğunu, kimi yönettiğini, hangi kararın beklendiğini ve zamanın neden durduğunu anlayabilmeli.
