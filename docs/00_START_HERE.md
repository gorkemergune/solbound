# Solbound — güncel ürün kararı ve okuma sırası

Sürüm: v0.2 · 14 Kasım 2026 · Durum: uygulama öncesi tasarım ve geliştirme sözleşmesi.

## Ürün cümlesi

**Kiminle gittiğin, yanına ne aldığın ve birbirinizi nasıl koruduğun; eve nasıl döneceğinizi belirler.**

Solbound, METU NASA Space Apps Challenge 2026 için tasarlanan, öğrencilerin Ay veya Mars görevinde kendi astronotlarını ve üç ekip arkadaşını yönettiği, hikâye ağırlıklı bir 2D STEM web oyunudur. Her karar yaşam desteği, enerji, gıda, radyasyon ve ekip dayanıklılığı arasında bir ödünleşim yaratır.

## Kullanıcının belirlediği yön

- Referans: [1in8b.life](https://1in8b.life/); kişisel başlangıç, akan zaman ve biriken hikâye hissi. Özgün arayüz ve içerik üretilecek.
- İlk girişte EN/TR; oyuncuya isteğe bağlı isim, boşsa rastgele isim.
- Rastgele karakter profili ve özellikler; boy, kilo, bilgi, motivasyon, deneyim gibi bilgiler değerlendirilecek.
- Ay veya Mars seçimi.
- 10–15 aday arasından tam üç arkadaş; toplam dört kişilik ekip. Arkadaşlara da isim verilebilir.
- Arkadaş kartlarında yaklaşık üç ana özellik, renkli barlar ve açılabilir ayrıntılar.
- Kalkış öncesi toplam 100V kapasiteye sığan eşya seçimi.
- Üstte sürekli görünen görev saati; yaklaşık bir gerçek dakika bir görev günü yaklaşımı.
- Hedef yaklaşık 30 görev günü; her gün 1–2 zorluk/seçim; üs ve karakter gelişimi, NASA temelli araştırma.
- Hatalı kararlar ekip veya oyuncu kaybına yol açabilir; grafik olmayan hikâye anlatımı.
- Gidiş ve eve dönüş sırasında görevler; bol özgün 2D görsel. LLM bağlantısı isteğe bağlı fikir.

## Uygulama için önerilen varsayılanlar

Bunlar kullanıcının kesin kararı olarak sunulmaz; ilk prototip için değiştirilebilir tasarım varsayımlarıdır:

| Konu | İlk varsayılan | Neden |
| --- | --- | --- |
| Aday sayısı | 12 | İstenen 10–15 aralığında, karşılaştırılabilir |
| Ana yetenekler | Teknik, bilim, ekip uyumu | Her biri farklı görevlere bağlanabilir |
| Fiziksel bilgiler | Profil detayı | Kaynaksız boy/kilo üstünlüğü üretmemek |
| Zaman | 60 aktif saniye / görev günü; kritik seçimde duraklama | Gerilim ve okunabilirliği birlikte denemek |
| Tam görev | 30 yüzey görev günü + ayrı yolculuk bölümleri | Gerçek uçuş süresi iddiasından kaçınmak |
| İlk sürüm | İki hedefte de 3 günlük dikey kesit + kısa dönüş demosu | Ekip/yük kararının sonucunu hızlı göstermek |
| 100V | Soyut yük alanı birimi | Gerçek hacim ve kütle modelini henüz iddia etmemek |
| Anlatım | Normal senaryoda ölüm mümkün; keşif modunda tahliye | Genç oyuncular için seçenek sunmak |
| LLM | İlk sürümde gerekli değil | Temel oyun çevrimdışı karar hesaplayabilsin |

30 gün, Ay/Mars seçimi ve iki yolculuk bölümü ürün hedefidir. Üç günlük demo bu hedefin tamamlandığı anlamına gelmez; ekranda açıkça demo olarak belirtilir.

## Okuma sırası

1. [Kullanıcı ve ekran akışı](USER_FLOW.md)
2. [Oyun sistemleri ve güncel mimari](GAME_SYSTEMS_V2.md)
3. [Hikâye ve olay modeli](STORY_EVENTS.md)
4. [Görsel ve etkileşim yönü](VISUAL_DIRECTION.md)
5. [Uygulama planı ve kabul ölçütleri](IMPLEMENTATION_PLAN_V2.md)
6. [Claude Code geliştirme promptu](CLAUDE_CODE_PROMPT.md)
7. [Model seçimi ve çalışma şekli](MODEL_WORKFLOW.md)

`PROMPT.txt` ve `docs/MAIN.txt` kullanıcı tarafından hazırlanmış bağlam dosyalarıdır; korunur. Sonraki doğrudan kullanıcı talimatı her zaman belge önerilerinden üstündür. Eski `PRODUCT.md`, `ARCHITECTURE.md`, `BACKLOG.md` ve `CLAUDE_DISCOVERY_TASK.md` tarihsel ilk öneriyi gösterir; 12-sol, yalnız Mars ve yalnız tur-onayı kapsamı güncel ürün hedefi değildir. Bilimsel kaynaklar için `RESEARCH.md` kullanılır; eski süre/kapsam varsayımları burada güncellenmiştir.

## Ürünün ayırt edici üç mekanizması

1. **Hazırlığın yankısı:** Seçilen arkadaş veya eşya sonraki olaylarda somut seçenek açar.
2. **Yaşayan görev günlüğü:** Kararlar, kayıplar ve küçük başarılar kişisel bir hikâye oluşturur.
3. **Başka bir karar:** Görev sonunda aynı olay koşullarında bir alternatifin kısa etkisi karşılaştırılabilir. Bu özellik P1'dir; gelecek olayları önceden ifşa etmez.

Piyasada benzersizlik iddiası doğrulanmış değildir. Hedef, bu mekanizmaları güçlü ve tutarlı bir deneyimde birleştirmektir.
