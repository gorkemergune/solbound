# Claude model seçimi ve çalışma şekli

Kontrol tarihi: 14 Kasım 2026. Bu öneri Solbound'un mevcut kapsamı için değerlendirmedir; bu repoda yapılmış bir model karşılaştırma testi değildir.

## Öneri

**Tek model seçilecekse Opus 5.5.** Ana geliştirme, ekran-motor entegrasyonu, hata düzeltme ve sürekli iterasyon için onu başlangıç modeli seçerdim. Anthropic de çoğu kodlama ve bilgi işi için Opus 5.5 ile başlamayı öneriyor. [Resmi duyuru](https://www.anthropic.com/claude-fable-and-mythos-5-2).

**Fable 5.2'yi başlangıçtaki kapsam/denge incelemesi veya zor bir mimari sorun için kullanabiliriz.** Uzun ve açık uçlu teknik işler için konumlandırılıyor; bu, otomatik olarak bu projede daha güzel arayüz garantisi değildir. [Fable ürün sayfası](https://www.anthropic.com/claude/fable).

Bu iş bölümü bir ürün önerisidir: kısa Fable incelemesi → Opus uygulaması → gerekirse Fable eleştirisi. İki modeli kullanmak zorunlu değildir. Gereksiz geniş keşif yerine oynanabilir küçük akış ve görsel geri bildirim kaliteyi belirler.

## Başlatma

Yerel `claude --help`, `--model` ve `--effort` seçeneklerini destekliyor. 2.1.323 sürümü önceki kontrolde görüldü. Resmi belgede model seçimi ve erişim sağlayıcıya/hesaba göre değişebiliyor. [Claude Code model yapılandırması](https://code.claude.com/docs/en/model-config).

```sh
cd /Users/gorkemparadise/Desktop/solbound
claude --model claude-opus-5-5 --effort high
```

İsteğe bağlı ayrı tasarım değerlendirmesi:

```sh
claude --model claude-fable-5-2 --effort high
```

Erişim yoksa `/model` menüsünden hesabın erişebildiği seçeneği kontrol et. Kullanıcı hesabının erişim ve kullanım koşulları burada doğrulanmadı. Fable bazı planlarda ek kullanım kredisi gerektirebilir; menüde görünen koşulu kontrol et. Sürüm kimliği sabitlenmiştir; sonraki tarihlerde güncel belgeleri yeniden kontrol edin.

## Fable için isteğe bağlı kısa inceleme promptu

```text
docs/archive/00_START_HERE.md ve bağlantılı v0.2 tasarım belgelerini oku. Solbound için ilk dikey kesiti oyun döngüsü, nedensellik, zamanlama, içerik maliyeti ve görsel açıklık açısından eleştir. En önemli beş riski ve her biri için en küçük çözümü docs/DESIGN_REVIEW.md'ye yaz. Kod yazma, kapsamı büyütme. Kullanıcı gereksinimini kendi tercihinle çıkarma; önerileri ayrı etiketle. Opus'un uygulamaya doğrudan geçebileceği kısa bir değerlendirme üret.
```

Ana geliştirme görevi [CLAUDE_CODE_PROMPT.md](CLAUDE_CODE_PROMPT.md) içindedir. Bu belgeler oluşturulurken Claude çalıştırılmadı, model ayarı değiştirilmedi ve bir göreve mesaj gönderilmedi.
