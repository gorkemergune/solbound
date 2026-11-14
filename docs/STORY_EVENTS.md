# Hikâye ve olay tasarımı

## Hikâyenin omurgası

Oyuncu bir astronot kimliğiyle başlar. Seçtiği üç kişinin uzmanlığı, aldığı malzemeler ve görev boyunca oluşan durumlar olayların seçeneklerini değiştirir. Karakterler yalnız kaynak bonusu değildir; kısa konuşmaları görev günlüğünde bir ilişki hissi yaratır.

| Bölüm | Duygu | Oynanış |
| --- | --- | --- |
| Kimlik | Merak | Rastgele başlangıcını tanı |
| Ekip | Bağ ve sorumluluk | Eksiklerini tamamlayan üç kişiyi seç |
| Yük | Beklenti ve ödünleşim | 100V'ye sığdır |
| Gidiş | Heyecan | İlk koordinasyon/enerji kararı |
| Yüzey başlangıcı | Keşif | Üssü tanı ve küçük bir sorunu çöz |
| Baskı | Gerilim | Birbiriyle yarışan ihtiyaçlar |
| Hazırlık | Sonuçlarla yüzleşme | Dönüş rezervi ve ekip durumu |
| Dönüş | Karşılık ve kapanış | Önceki kararlarla açılan çözümler |

## Günlük ritim ve tam kampanya hedefi

Her yüzey günü 1–2 olay/seçim hedeflenir: bir ana operasyon kararı ve gerekirse kısa ekip/araştırma olayı. Hepsi ölümcül kriz değildir. Aynı çatışma farklı metinle tekrar tekrar kullanılmaz.

30 günlük kampanya için önerilen bölümleme: gün 1–5 yerleşme, 6–12 sistem baskısı, 13–20 birleşen sorunlar, 21–27 toparlanma ve dönüş hazırlığı, 28–30 son kontroller. Bu bir içerik planıdır; bu günler için içerik henüz yazılmamıştır. Toplam 30–60 yüzey olayı ve yolculuk görevleri ayrı yazım/denge işi gerektirir.

## İlk dikey kesitteki olay seti

| ID | Aşama | Durum | Asıl ödünleşim |
| --- | --- | --- | --- |
| OUT-01 | Gidiş | İniş öncesi ek sistem kontrolü | Ekip yorgunluğu ve güvenilirlik |
| MOON-01 | Ay gün 1 | Güç dağıtımını devreye al | Yaşam desteği ve sera |
| MOON-02 | Ay gün 2 | Sızdırmazlık kontrolünde sorun | Yedek parça veya ekip zamanı |
| MOON-03 | Ay gün 3 | Parçacık olayı uyarısı | Sığınak ve dış görevi erteleme |
| MARS-01 | Mars gün 1 | Su işleme kapasitesi düşüyor | Filtre kullanımı veya bakım zamanı |
| MARS-02 | Mars gün 2 | Toz güneş üretimini azaltıyor | Batarya rezervi ve sera |
| MARS-03 | Mars gün 3 | Hasat/sera sisteminde sorun | Bilim uzmanlığı, su ve ekip görevi |
| RETURN-01 | Dönüş | Kalkış rezervi kontrolü | Görev kazancı ve dönüş güvenliği |
| RETURN-02 | Dönüş | Yardımcı devrede arıza | Taşınan parça, teknik beceri ve zaman |

Olaylar kurgusal görev durumlarıdır; her biriyle ilişkili fiziksel/teknik iddia ayrı kaynaklandırılır. İlk sürümde hedef başına üç ana olay ve ikişer kısa ekip/araştırma olayı planlanır; böylece en az bir günde ikinci karar denenebilir. Kısa demo dönüşü gerçek 30 günlük kampanya bitişi gibi etiketlenmez.

## Olay sözleşmesi

```ts
type StoryEvent = {
  id: string;
  destination: 'moon' | 'mars' | 'both';
  phase: 'outbound' | 'surface' | 'return';
  trigger: { day?: number; flag?: string };
  once: boolean;
  titleKey: string;
  bodyKey: string;
  illustrationId: string;
  researchIds: string[];
  options: EventOption[];
};
```

`EventOption`: sabit ID, çeviri anahtarı, ekip/eşya/araştırma koşulları, anlık maliyetler, tamamlanma süresi, beklenen etkiler, varsa tanımlı risk ve sonuç metni anahtarları. Kapalı seçeneğin nedeni görünür. Bütün seçenekler kilitliyse temel bir bekle/tasarruf/tahliye seçeneği tanımlanır; açıklamasız çıkmaz ekran olmaz.

## Bir örnek kararın tam yapısı

**MARS-02: Panel üretimi düşüyor.**

Ekipten bir kişi: “Bu hızla gidersek rezervlerimizi kullanacağız. Seranın ışıklarını azaltabiliriz.”

| Seçenek | Gereksinim | Bedel | Sonuç |
| --- | --- | --- | --- |
| Serayı ekonomik moda al | Yok | Büyüme yavaşlar | Güç talebi azalır |
| Tam üretimi sürdür | Yeterli batarya | Depolanmış enerji harcanır | O anki üretim korunur |
| Koşullar güvenliyse panel bakımı planla | Uygun ekip ve zaman | Başka iş ertelenir | Birikmiş yüzey tozu etkisi kısmen azaltılabilir |

Atmosferdeki tozun azalttığı ışığı panel temizliği tamamen geri getirmez. Dış görev tehlikeliyse bakım seçeneği gerekçesiyle kilitlenir. Sayısal etkiler veri dosyasında tanımlanır; henüz doğrulanmış değer yoktur.

Karar sonrası günlük: “Yaşam desteğinin enerjisini korudun. Sera büyümesi yavaşladı.” Sonraki uygun olayda: “Kalkışta aldığınız parça kiti bu onarımı mümkün kılıyor.” Kaynak farkları motorun gerçek sonucundan gelir; metin farklı sonuç uydurmaz.

## Ekip konuşmaları ve kayıp

Her karaktere kısa bir geçmiş ve 2–3 konuşma tonu verilir. İsimler seçilen ekipten gelir; cinsiyet, beden veya isim üzerinden yetenek kalıbı kurulmaz. Görünür sağlık/stres değişimleri günlükte anlatılır; gerçek hastalık tanısı iddia edilmez.

Tehlike önce belirtiler ve seçeneklerle bildirilir. Kayıp olduğunda grafik sahne yerine kısa, saygılı görev kaydı ve neden zinciri sunulur. Keşif modu önerisi kaybı tahliye olarak anlatır. Tam ekip kaybı ve oyuncu kaybı terminaldir; tek arkadaş kaybı kalan ekip ve iş kapasitesini etkiler.

## Araştırma ve alternatif karar

Araştırma kartı bir sorunu açıklamalı veya yeni bir karar olanağı sağlamalı; yalnız ansiklopedi puanı vermemeli. Örnek: enerji rezervi, geri kazanımın sınırları, korunma ve gecikmeli gıda üretimi.

P1 alternatif-karar özelliği, karar öncesi snapshot ve aynı çevre koşullarıyla kısa karşılaştırma yapar. Sadece aynı rastgele sayı dizisini çağırmak yetmez: sonuç çekilişleri olay/karar kimliğiyle eşleştirilir. Alternatif yeni olay açıyorsa kesin bütün gelecek iddiası yerine yalnız bu adımın etkisi gösterilir. Gerçek kayıt ve PRNG değişmez.
