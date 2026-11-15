# Araçlar ve otomasyon değerlendirme planı

Amaç: takımın farklı uygulama ve otomasyonları değerlendirirken ilk oynanabilir sürümü geciktirmemesi. Aşağıdakiler mevcut bağlantı veya kurulmuş otomasyon beyanı değil; değerlendirme adaylarıdır. Güncel fiyat, izin ve özellikler seçim sırasında resmi kaynaklardan kontrol edilir.

| İhtiyaç | İlk yaklaşım | Alternatif / ne zaman gerekli | Karar ölçütü |
| --- | --- | --- | --- |
| Kod ve işler | GitHub repo + Issues/Projects | Ekip zaten kullanıyorsa Linear | Kurulum süresi, ekip erişimi, PR/issue ilişkisi |
| Mimari ve uygulama | Codex ile repo içinde çalışma | Claude ile bağımsız keşif ve eleştiri | İncelenebilir çıktı, kaynak doğruluğu, dosya çakışması |
| Arayüz tasarımı | Repo içi SVG/CSS ve kısa wireframe | Takımın mevcut Figma dosyası | İşleyen demoya aktarım süresi |
| Hızlı arayüz denemesi | Ayrı deneme dalı veya mockup | Sites/Lovable | Motoru dış servise bağlamama, dışa aktarım ve entegrasyon |
| İç dokümantasyon | Repo içindeki Markdown | Takım zaten kullanıyorsa Notion/Docs | Tek doğruluk kaynağı ve erişim |
| Dağıtım | Mevcut statik hosting hesabı | Vercel/Netlify/Pages değerlendirmesi | Mevcut hesap, erişim, SPA yönlendirme ve geri alma |
| İçerik ve görseller | Basit özgün SVG ve kaynaklı metin | Gerekirse üretilmiş görsel varlık | Lisans, okunabilirlik, yükleme boyutu |

## Kademeli otomasyon

1. **Önce yerel komutlar:** typecheck, engine test, build. Henüz scaffold olmadığı için kurulmadılar.
2. **Repo erişimi sonrası PR kontrolü:** lockfile ile kurulum ve aynı üç komut. Workflow izinleri gereken en düşük düzeyde; fork PR'larında secret gerektirmesin.
3. **İlk oynanış sonrası:** sabit seed ile çekirdek E2E ve birkaç politika için denge kontrolü.
4. **Dağıtım bağlantısı sonrası:** PR önizleme, ana dal dağıtımı ve açılış kontrolü. Sağlayıcı ve hesap seçimi henüz yapılmadı.

Otomatik merge, öğrenci davranışı izleme, takıma mesaj gönderme ve yinelenen zamanlayıcı ilk pakette kurulmaz. Kullanıcı henüz belirli bir izleme sıklığı veya bildirim talep etmedi. Bu belge yalnız uygulanacak otomasyon adaylarını tanımlar.

## Claude ile görev sınırı

Claude bağımsız araştırma ve mimari eleştiri yapacak; üretim kodu ve paket kurulumu bu görevin kapsamına girmez. Teslimatı önce rapor olarak incele, doğrulanmamış iddiaları kaynak kayıtlarına ekleme. Oturum bilgisi, token veya öğrenci verisi görev metnine konmaz.
