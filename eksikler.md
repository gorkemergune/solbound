# Eksikler ve değişmesi gerekenler

Son revizyon: 14 Kasım 2026 (v0.7b). Durum işaretleri: ✅ yapıldı · 🟡 izlenecek · ⏳ açık.
Güncel kapsam: [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md) · önceki turlar: `docs/IMPLEMENTATION_NOTES.md` · test görevi: [docs/V4_PROMPT.md](docs/V4_PROMPT.md).

### ✅ Ekip seçimi sayfalaması görünmüyordu
> ekip seçimi sayfasını sayfalandırmışsın o gözükmüyor yana kaymak onu eski haline getir. sayfanı aşağı kaydırdıkça yandaki ekip profili de onunla beraber kaysın.

- Sayfalama kaldırıldı; 16 aday yeniden tek ızgarada.
- Sağdaki **ekip profili** artık sayfa kaydıkça yerinde duruyor (yapışkan). Eskiden çalışmıyordu, çünkü `.prep-main` öğesindeki `overflow-x: auto` bir kaydırma kutusu oluşturuyordu; `clip` yapıldı. Profil uzunsa kendi içinde kayıyor.

### ✅ Sahnenin yanlarındaki siyah boşluklar ve yükseklik (bug2.png)
> uzaya inince yanlarda siyah boşluklar var onu kaldır ve ana ortam ekranının yüksekliğini biraz düş. alttaki karar kısmı biraz daha gözüksün.

- Yükseklik sınırı yüzünden sahne ortalanıp yanlarda siyah şerit kalıyordu. Artık tam genişlikte ve siyah şerit yok.
- Boş gökyüzünün üst kısmı kırpıldı: sahne yaklaşık %17 alçaldı (1373 px genişlikte 444 px). Dünya ve Güneş aşağı alındı, kırpılmıyorlar.
- Karar kartı ekranda daha yukarıda başlıyor.

### ✅ Görevleri hangi ekip arkadaşının yapacağı (2 × 2 → 3 × 2)
> sana dediğim taskleri hangi ekip arkadaşı yapsını ayarlamamışsın. ekip arkadaşı ayarlama kısmı ilk başta 2x2 olcak sonradan 2 kişi daha geline 3x2 olucak

- Kişi gerektiren bir seçenek seçilince “Kim gidecek? (seçilen: n/m)” alanı **bütün ekibi** ızgara olarak gösteriyor: **4 kişide 2 × 2**, takviye ekiple **6 kişide 3 × 2**.
- Seçilemeyen kişiler gri görünüyor ve nedeni yazıyor: başka görevde, sığınakta, uzakta, gerekli uzmanlık yok ya da şu an dışarı çıkamaz.
- Plan sekmesindeki hazırlık görevlerinde de kişi seçimi var. Bir CSS çakışması yüzünden karar kartındaki alan yuvarlak görünüyordu; düzeltildi.

### ✅ Arayüz çok büyüktü, sekmeler sığmıyordu
> bu sefer genel olarak sekmeler, ui'lar çok büyük olmuş biraz küçültmemiz ve sekmeler açıldığında sığması lazım

- Temel yazı boyutu 16 → 15 px (1700 px ve üstü ekranlarda 16).
- Sağ panel 370 → 340 px.
- Sekmeler daha küçük ve her zaman sığıyor; gerekirse yana kayıyor.
- Saat, kaynak kartları, hız düğmeleri, olay başlığı ve seçenekler daha kompakt; olay görseli en fazla 120 px.
- 1373 px genişlikte yatay taşma yok (ölçüldü).

## Hâlâ açık
- ⏳ “Başka bir karar verseydin?” karşılaştırması.
- ⏳ Safari/Firefox, gerçek telefon ve ekran okuyucu testleri.
- ⏳ Yayın (deploy); GitHub Action için depoya `NASA_API_KEY` sırrı eklenmeli.
- 🟡 Denge ve oynanış: V4 testinin sonuçlarına göre.
