Simülasyonda toplam 157 bin oyun koşturdum ve analiz bu sayıların üzerine kurulu: 40.468 oyunluk düzeltilmiş ana tarama, 100.000 oyunluk ilk tarama ve 16.735 oyunluk sera yönetimi testi. En önemli üç sonuç şunlar:

- Mars baharında oyuncuyu uyarmadan kazanılamaz hale getiren bir hata buldum.
- Gıda paketi tek başına baskın eşya.
- Acil durum olayları neredeyse hiç kurtarmıyor.

API anahtarı ise canlıya alındığında ele geçirilebilir; risk yüksek değil ama önlemesi kolay.

Nasıl test ettim

Testler gerçek motor üzerinden yapıldı: aynı komut kapısı, gerçek kütle bütçesi, seed'den üretilen oyuncu profili ve 16 aday. Her oyunda şunlar değişti:
- Hedef: Ay kutup, Ay ekvator, Mars bahar, Mars yaz (eşit dağıtıldı)
- Ekip: 16 adaydan rastgele 3 kişi
- Kargo: boş / az / rastgele / dolu
- Mod: normal / keşif
- Canlı uzay havası: NASA DONKI verisi var / yok
- Oyuncu tipi: özenli / karışık / rastgele / pervasız

Bütün kombinasyonları denemek mümkün değil (yalnız kargo kombinasyonu bile milyonlarca), bu yüzden tabakalı rastgele örnekleme kullandım.

Sınırlar:
- Oyunları insanlar değil botlar oynadı.
- "Oyuncuyu tutan şey"i doğrudan ölçemem; aşağıdakiler vekil göstergeler.
- Eşya ve özellik etkileri korelasyondur.
- Botlar araştırma, rutin ve güç önceliği kontrollerine dokunmadı.

İlk 100.000'lik taramada Mars baharı için bot ayarım hatalıydı. Düzeltip yeniden başlattım, ama Claude Code sistem belleği azaldığı için işi 40.468 oyunda durdurdu. Yeniden başlatmadım. Aşağıdaki sayılar bu düzeltilmiş 40.468 oyundan.

Kimler oyunu geçiyor

┌─────────────────┬────────────┬───────┬─────────────┬───────┐
│                 │ Tam başarı │ Kısmi │ Erken dönüş │ Kayıp │
├─────────────────┼────────────┼───────┼─────────────┼───────┤
│ Genel           │ %29,9      │ %38,1 │ %22,6       │ %9,4  │
├─────────────────┼────────────┼───────┼─────────────┼───────┤
│ Özenli oyuncu   │ %60,2      │ %31,4 │ %2,1        │ %6,2  │
├─────────────────┼────────────┼───────┼─────────────┼───────┤
│ Rastgele oyuncu │ %7,2       │ %46,4 │ %35,9       │ %10,5 │
├─────────────────┼────────────┼───────┼─────────────┼───────┤
│ Pervasız oyuncu │ %0,5       │ %14,8 │ %69         │ %15,7 │
└─────────────────┴────────────┴───────┴─────────────┴───────┘

- Kararlar hazırlıktan daha belirleyici. Bu iyi bir tasarım işareti.
- Ay belirgin biçimde daha kolay. Özenli oyuncu Ay'da %74–78, Mars yazında %52, Mars baharında %38 başarı alıyor. Projenin kendi notları da bunu söylüyordu.
- Kargo: Boş kargoyla başarı %12,8, rastgele veya dolu kargoyla %34–36.
- Gıda paketi baskın eşya. Tek başına başarıyı Ay'da +18, Mars'ta +22,6 puan artırıyor. En başarılı 2'li kargo setlerinin hepsinde gıda var; plan bunu denge sorunu olarak not etmemizi istiyor. Patates (+12 / +15,5) ve Mars'ta filtre (+11,5) de güçlü.
- Ağır ama işe yaramayan eşyalar: MOXIE (30 kg) başarıyı 4,5 puan düşürüyor. Koruma kiti (45 kg) +0,5–1,8, batarya (32 kg) +1–2,5 getiriyor.
- Ekip özellikleri:
  - En faydalılar: levazımcı +7,5, beslenme uzmanı +6,9, mekanik +6, enerji mühendisi +3,5.
  - Slotu boşa harcatanlar: haberleşme −4,3, kimyager −4,1, uzay havası analisti, botanikçi, arabulucu ve "soğukkanlı" (yaklaşık −3).
- Yetenekler:
  - Ekipte teknik toplam yüksekse kayıp %13,6'dan %3,4'e iniyor.
  - Bilim yüksekse kayıp artıyor. Yetenek bütçesi ortak olduğu için bilim teknikten çalıyor.
  - Ekip uyumu (teamwork) hiçbir sonucu etkilemiyor; bu yetenek fiilen boşta.
- Keşif modu kayıpları tahliyeye çeviriyor, başarı oranı aynı kalıyor; tasarlandığı gibi çalışıyor. Canlı DONKI verisi başarıyı değiştirmiyor (%26,0 / %26,6), yani adil.
- Neden kaybediliyor:
  - Kısmi başarıların çoğu dönüş rezervinin tutmamasından geliyor; bunların %77'sinde güç, %33'ünde gıda açığı var.
  - Kayıplarda Mars'ta güç ve su birlikte çöküyor, Ay'da oksijen bitiyor.
  - Kayıpların %85'i 20–30. günlerde oluyor; oyuncu 20 dakikadan fazla oynadıktan sonra.

Bulduğum hata ve denge sorunları

1. Mars baharında "fırtınayı bekle" tuzağı (en kritik hata).
   - MARS-02'de bu seçenek serayı kapatıyor. Fırtına bitince src/engine/sim.ts:172 serayı otomatik olarak tam moda alıyor.
   - Baharda güneş az olduğu için batarya görev sonuna kadar yaklaşık 13 kWh'te kalıyor. Dönüş için 20 kWh gerekiyor.
   - Sonuç: seraya dokunmayan oyuncuda 2.098 oyunda %0 başarı. Batarya düşünce serayı ekonomik moda alan oyuncu %29,5'e çıkıyor, ama oyun bunu hiç söylemiyor.
   - Önerim: otomatik geri dönüş önceki moda olsun, ya da "bu güçle dönüş eşiğine ulaşılamaz" uyarısı eklensin.
2. Acil durumlar kurtarmıyor. Tıbbi acil durumda ilk yardım çantasını kullanınca başarı %0,7, kayıp %53. Su acil durumunda başarı %0. Seçenekler belirtiyi tedavi ediyor; asıl neden olan su ya da güç açığı sürüyor. Bu, plandaki "müdahale olanağı" şartıyla çelişiyor.
3. Dönüşte "bir gün ertele" neredeyse hiç işe yaramıyor (sonrasında başarı %5,4). RETURN-02'de "yedek hat" seçeneği %99,7 ile baskın.
4. Tempo: Günlerin %33'ünde hiç karar yok. Dönüşten hemen önce, 28–30. günlerde, günde yalnız 0,2–0,55 olay düşüyor; doruk anı boş geçiyor. 2. gün de zayıf.
5. Repodaki denge testi bu sorunları yakalayamıyor. Yalnız 3 seed, sabit ekip (c01–c03) kullanıyor ve kütle kontrolünü atlıyor; Mars baharında da "ekonomik mod"u seçiyor.

Oyuncuyu oyunda tutan görevler (vekil göstergeler)

- Kararın sonucu en çok değiştirdiği olaylar: Ay gecesi (NIGHT), hasatta "gözlü patatesi yeniden ek", Ay depremi (QUAKE), güç dağıtımı (MOON-01), gölge dönemi (SHADOW), su işleme (MARS-01), buz seferi (ICE), Ay tozu alerjisi (HAYFEVER). Bunlar oyunun omurgası.
- Geri sayımlı büyük olaylar en güçlü kanca.
  - Hazırlık yapılmadığında: fırtınada %0,2, Ay gecesinde %0,4 başarı.
  - Hazırlık yapıldığında: %21 ve %51.
  - Bu farkın bir kısmı oyuncu tipinden geliyor.
- "Bunu mümkün kılan" anları: Oyunların %98,8'inde var, oyun başına ortalama 8,4 kez. Arıtıcı, haberleşme, botanikçi, sağlık görevlisi ve oksijen mumu bu anları çok nadir üretiyor; oyuncu bunların işe yaradığını görmüyor.
- Gerilim iyi: Kazanılan oyunların %62,5'inde bir kaynak %20'nin altına düşüyor. Buna karşılık sağlık neredeyse ikili: kazananların yalnız %0,6'sında sağlık 60'ın altına iniyor.
- Etkisi zayıf dolgu olaylar: Sabatier kararı, toz hortumu, Mars'ın küçük ekip olayları ve Mars arama-kurtarma. Mars'ta sonucu kararlar değil güç/su kayması belirliyor.

NASA API anahtarı ele geçirilebilir mi?

Evet, kesin olarak ve birkaç saniyede.
- vite.config.ts içindeki envPrefix: ['VITE_', 'NASA_'] ayarı anahtarı yayımlanan JavaScript dosyasının içine gömüyor.
- Anahtar ayrıca src/live/donki.ts:120'de URL'de api_key= olarak gidiyor; tarayıcının Ağ sekmesinde açıkça görünüyor.
- .env'in git'e girmemesi yalnız repoyu korur, yayımlanan siteyi korumaz.
- İyi haber: anahtarın git geçmişinde hiç olmadığını kontrol ettim.

Riskler:
- Kota tüketme (asıl risk). Gerçek yanıt başlıklarından ölçtüğüm limit saatte 2.500 istek. Her ziyaret 5 istek yapıyor, yani yasal kullanımla saatte yaklaşık 500 ziyaret kaldırır. Bir betik bu kotayı bir dakikada bitirebilir; o saat boyunca herkes eski veya oyunla gelen veriyi görür. Oyun çökmez, ama jüri demosu sırasında "canlı" özellik sessizce bayatlar.
- Anahtarın askıya alınması. Başkası bu anahtarla bütün api.nasa.gov servislerini kötüye kullanırsa anahtar engellenebilir. Anahtar kaydı yapan kişinin e-postasına bağlı. NASA'nın kullanım şartları sayfası JavaScript ile yüklendiği için okuyamadım; bu nokta doğrulanmadı.
- Aynı anahtar başka projelerde kullanılıyorsa onlar da etkilenir.
- Risk olmayanlar: Anahtar ücretsiz, fatura çıkmaz. Yazma yetkisi, kişisel veri ya da hesap erişimi vermiyor; DONKI verisi zaten herkese açık.

Önlem (en basitinden):
1. Tarayıcıdan NASA'yı hiç çağırmamak. Zamanlanmış bir GitHub Action npm run donki:snapshot komutunu çalıştırır, anahtar GitHub Secrets'ta durur, site yalnızca statik JSON okur. Anahtar paketten çıkar, kota da ziyaretçi sayısından bağımsız olur.
2. Alternatif: Cloudflare Worker veya Vercel/Netlify gibi sunucusuz bir fonksiyon. Anahtar sunucuda tutulur, 30 dakikalık ortak önbellek ve IP başına limit uygulanır, yalnız bu 5 uç noktaya izin verilir.
3. Hangisi seçilirse seçilsin yayından önce envPrefix'ten NASA_ çıkarılmalı. Bu proje için ayrı bir anahtar kullanılmalı ve kötüye kullanım görülürse yenilenmeli.

Repo dosyalarına dokunmadım. Bir not: çalışma ağacında .env.example silinmiş görünüyor; bunu ben yapmadım.

Önerdiğim sıradaki işler: seranın otomatik tam moda dönmesi hatasını düzeltmek, gıda ile MOXIE/koruma kiti/batarya dengesini ayarlamak ve acil durumlara asıl nedeni çözen bir seçenek eklemek. İstersen bunu raporla birlikte docs/BALANCE_REPORT.md olarak yazabilir ya da paylaşılabilir bir sayfa yapabilirim.

Simülasyon betikleri ve ham veriler C:\Users\PC\AppData\Local\Temp\claude\fb2a567bf73f8919\02bd8d26-3cf3-42f3-ba23-3707184827bc\scratchpad\sim klasöründe; tüm tablolar summary_v2.json içinde.