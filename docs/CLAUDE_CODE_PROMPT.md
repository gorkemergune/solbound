# Claude Code — uygulama görevi

Aşağıdaki bloğu Solbound deposunda çalışan Claude Code'a ver. Bu belge görevi başlatmaz; kopyalanabilir görev metnidir. Model önerisi [MODEL_WORKFLOW.md](MODEL_WORKFLOW.md) içindedir.

```text
Solbound'u bu repoda çalışır, görsel olarak özenli ve oynanabilir bir 2D STEM web oyununa dönüştür. METU NASA Space Apps Challenge 2026 için çalışıyoruz. Sen deneyimli bir oyun tasarımcısı ve frontend mühendisi gibi ürün bütünlüğünden sorumlusun.

Önce varsa AGENTS.md ve CLAUDE.md'yi, kullanıcı bağlamı PROMPT.txt ile docs/MAIN.txt'yi oku. Ardından şu sırayı izle:
1. docs/00_START_HERE.md
2. docs/USER_FLOW.md
3. docs/GAME_SYSTEMS_V2.md
4. docs/STORY_EVENTS.md
5. docs/VISUAL_DIRECTION.md
6. docs/IMPLEMENTATION_PLAN_V2.md
7. Bilimsel kaynak başlangıcı için docs/RESEARCH.md

Sonraki doğrudan kullanıcı talimatını öncelikli tut. v0.2 belgeleri önceki PRODUCT.md, ARCHITECTURE.md, BACKLOG.md ve araştırma-only CLAUDE_DISCOVERY_TASK.md'nin eski kapsamını günceller. Eski 12-sol, yalnız Mars ve sadece tur onayı planını uygulama. Mevcut kullanıcı dosyalarını ve MIT lisansını koru.

Ürün: 1in8b.life'taki kişisel başlangıç, zaman ve hikâye kaydı hissinden ilham alan özgün bir uzay görevi. Siteyi erişebiliyorsan incele; tasarımını veya varlıklarını kopyalama. Erişemiyorsan erişmiş gibi konuşma.

Oyuncu EN/TR seçer, rastgele özellikli astronotunu isimlendirir, Ay veya Mars hedefini seçer. Varsayılan 12 adaydan üç arkadaş seçer; arkadaşların da isimleri düzenlenebilir. Her kartta üç anlaşılır özellik ve açılabilir ayrıntı vardır. 100V kapasite içinde yük hazırlar. Dört kişilik ekiple kalkar, yolculuk görevini çözer, görsel üste kaynakları ve ekibi yönetir, araştırma yapar ve eve dönüş kararlarını verir. Ekip ve yük seçimi sonraki seçenekleri gerçekten etkilemelidir.

Tam ürün 30 günlük yüzey görevini hedefliyor. Bu çalışmanın somut ilk teslimatı: hazırlık akışının tamamı, iki hedefte de oynanabilir 3 günlük demo, bir gidiş görevi, hedef başına üç ana + iki küçük olay, dönüş hazırlığı ve iki dönüş kararı, anlamlı sonuç ekranı. Demo kısaltmasını açıkça belirt. 30 günlük tamamlanmış kampanya iddia etme.

Önerilen temeli kullan: React + TypeScript + Vite, SVG/CSS ile özgün 2D sahneler, saf deterministik motor ve sürümlü yerel kayıt. Kurulu başka bir temel varsa önce incele ve gereksiz yeniden kurulum yapma. Runtime LLM veya backend ilk teslimatı engellemesin. Ekranda görülen her ana kontrol gerçek durum ve davranışa bağlı olsun.

Görsel kalite hedefi: güçlü açılış sahnesi, tutarlı astronot portreleri, hedefe özgü manzaralar, okunabilir 100V yük hazırlığı ve yaşayan küçük üs. Uzay teması yalnız koyu arka plan ve kartlardan oluşmasın. TR/EN bütün akışta çalışsın. Hover bilgisi tıklama ve klavyeyle de erişilsin. Kritik kararın duraklaması görünür olsun; sekme arka plandayken zaman ilerlemesin.

Mühendislik: bütçe/kapasite, görev süresi ve kaynak akışlarını motor hesaplasın. Rastgelelik seed'li olsun; önizleme ve render zar atmasın. Aynı olay iki kez çözülmesin. Kayıt dil değişiminde veya yenilemede oyunu sıfırlamasın. Başarısızlıklar belirtiler, müdahale fırsatı ve açıklanabilir sonuç taşısın. Ekip/oyuncu kaybı veri modelinde desteklensin; grafik şiddet olmasın. Keşif modunda tahliye anlatımı önerisini uygula ve varsayım olarak kaydet.

NASA bilgilerini olay/araştırma kartlarında kullan: resmi kaynağı doğrula, ISS örneklerini Mars performansı diye sunma, doğrulanmamış sayı uydurma. Kaynaklı, türetilmiş ve oyun için seçilmiş parametreleri ayır. Canlı veri/API olmasa da oyun çalışsın.

Çalışma şekli: Önce mevcut repoyu incele, kısa planı ve varsayımları docs/IMPLEMENTATION_NOTES.md'ye yaz; sonra uygulamaya geç. Yalnız öneri veya uzun raporla bitirme. Önce bir kriz için hazırlıktan sonuca kadar çalışan akış, ardından ikinci hedef ve kalan içerik. Küçük rutin kararları kendin çöz; gerçek engel yoksa sürekli onay bekleme. Kapsamı yetiştiremezsen en küçük oynanabilir akışı koru ve tamamlanmayanları açıkça kaydet.

Doğrulama: typecheck, önemli motor testleri, production build ve mümkünse tarayıcıda uçtan uca oynama. Masaüstü ve mobil görünümü kontrol et; gerçek sorunları düzelt. Çalıştırmadığın testi veya incelemediğin ekranı başarılı sayma. V2 planındaki kabul ölçütlerini değerlendir.

Sonunda uygulamayı nasıl açacağımızı, oynanabilir kapsamı, test sonuçlarını ve kalan işleri bildir. Commit, push veya dağıtım yapma; kullanıcı ayrıca isterse yapılır. Yetki/bağlantı engelini ve gerekli kullanıcı adımını açıkça belirt; bunu tamamlanmış iş gibi gösterme.
```
