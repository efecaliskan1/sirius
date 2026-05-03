# Sirius — App Store Yükleme Rehberi

Bu doküman, Sirius'u Apple App Store'a yüklemek için yapman gerekenleri sırasıyla açıklar. Bazı adımlar **senin kişisel hesabınla yapılmak zorunda** (Apple Developer hesabı, sertifikalar, vs.) — onları ben senin yerine yapamam.

## Şu anda hazır olanlar ✅

- **Bundle ID:** `com.efecaliskan.sirius`
- **Version:** 1.0 (build 1)
- **App Icon:** Var (`ios/App/App/Assets.xcassets/AppIcon.appiconset/`)
- **Splash screen:** Var
- **Info.plist:** NSPhotoLibraryUsageDescription + NSCameraUsageDescription eklendi
- **Capacitor:** v8.3.1, iOS native bridge çalışıyor
- **Firebase:** Auth + Firestore + Native Google Sign-In bağlı
- **Production build:** ✅ Vite build başarılı (1.36 MB bundle, 416 KB gzipped)

## Yapman gerekenler (sırayla)

### 1. Apple Developer Program üyeliği — 99 USD/yıl

https://developer.apple.com/programs/enroll/

- Bireysel veya kurumsal seçebilirsin
- Onay 24-48 saat sürebilir
- Sirius'u kişisel olarak yayınlayacaksan **Bireysel** yeter

### 2. App Store Connect'te uygulama kaydı

https://appstoreconnect.apple.com → My Apps → "+" → New App

Doldurulacak alanlar:
- **Platform:** iOS
- **Name:** Sirius (App Store'da görünen ad)
- **Primary Language:** Turkish (tr) veya English
- **Bundle ID:** `com.efecaliskan.sirius` (Developer portal'da önce oluştur)
- **SKU:** `sirius-001` (sen seç, unique olmalı)

### 3. Bundle ID'yi Developer Portal'da oluştur

https://developer.apple.com/account/resources/identifiers/

- Identifier: `com.efecaliskan.sirius`
- Capabilities: **Sign in with Apple** (eğer kullanıcılar Apple hesabıyla girecekse — Sirius şu an Google ve email kullanıyor, Apple zorunlu değil ama önerilir)
- Push Notifications: Eğer iOS push notification kullanacaksan aç (şu an Sirius browser-only notification var, opsiyonel)

### 4. Sertifikalar ve Provisioning Profiles

**En kolay yol:** Xcode'a Apple ID ile gir → otomatik halleder.

Xcode → Settings → Accounts → "+" → Apple ID → Developer hesabınla giriş yap.

Sonra Xcode → Project navigator → App target → Signing & Capabilities:
- ✅ Automatically manage signing
- Team: Senin Apple Developer Team'in
- Bundle Identifier: `com.efecaliskan.sirius`

### 5. Build numarasını artır (her yükleme için yeni build no)

`ios/App/App.xcodeproj/project.pbxproj` içinde:
```
CURRENT_PROJECT_VERSION = 1;   →   2 (sonraki yüklemede 3, vs.)
MARKETING_VERSION = 1.0;       →   1.0 (kullanıcıya görünen sürüm)
```

Ya da Xcode'da General → Identity → Build, Version alanlarından.

### 6. Production build oluştur

```bash
cd /Users/efe/Documents/Playground/sirius
npm run mobile:build       # web + cap sync
npx cap open ios           # Xcode aç
```

Xcode'da:
- Üstteki cihaz seçicide **"Any iOS Device (arm64)"** seç (gerçek cihaz veya simulator değil!)
- Product → Archive
- Archive bittikten sonra Organizer açılır → "Distribute App" → "App Store Connect" → Upload

Yükleme 15-45 dakika sürer (Apple processing).

### 7. App Store Connect'te metadata doldur

**Genel bilgiler:**
- Subtitle: max 30 karakter (örn. "Odaklan, planla, başar")
- Category: Education / Productivity
- Description: Uygulamanın ne yaptığını anlatan 4000 karaktere kadar metin
- Keywords: 100 karaktere kadar virgülle ayrılmış (örn. "pomodoro, ders, çalışma, plan, odak, takvim")
- Support URL: Senin sitende destek sayfası
- Marketing URL (opsiyonel)
- Privacy Policy URL: **ZORUNLU** (Sirius Firestore'da kullanıcı verisi sakladığı için)

**Screenshot gereksinimleri:**

iOS 17+ için minimum gerekli:
- iPhone 6.7" (iPhone 15 Pro Max): 1290 × 2796 px — en az 3 adet
- iPhone 6.5" (iPhone 11 Pro Max): 1242 × 2688 px — en az 3 adet
- iPad 12.9" (varsa): 2048 × 2732 px

Xcode Simulator'dan Cmd+S ile alabilirsin. Ana ekran, Pomodoro, Tasks, Schedule, Stats ekranlarını koy.

**App Preview video (opsiyonel ama önerilir):** 15-30 saniyelik tanıtım

**App Privacy:**
App Store Connect → My Apps → Sirius → App Privacy

Sirius'un topladığı veriler:
- ✅ Email Address (auth)
- ✅ Name (profile)
- ✅ Photos (profile picture)
- ✅ User Content (tasks, schedules, sessions)
- ✅ Identifiers (User ID, Firebase UID)
- ❌ Tracking yok (Sirius reklam göstermiyor)

Her bir veri için "Linked to user / Not linked", "Used for tracking / Not used for tracking" işaretle.

### 8. Privacy Policy hazırla — **ZORUNLU**

Sirius şu verileri topluyor: email, isim, profil fotoğrafı, çalışma oturumları, takvim verisi. Bu yüzden Privacy Policy şart.

Hızlı yol: https://app.freeprivacypolicy.com/ veya https://www.iubenda.com/

Açıkça belirtmesi gereken:
- Hangi verileri topluyorsun
- Nerede saklıyorsun (Firebase / Google Cloud)
- Üçüncü taraflarla paylaşıyor musun (Google sign-in)
- Kullanıcı verisini silme hakkı (Settings'te delete account butonu olmalı veya support@... iletişim)

Bu URL'i App Store Connect'e gir.

### 9. Sign in with Apple (önerilir, çoğu zaman zorunlu)

**Önemli:** App Store Review Guidelines 4.8 — eğer üçüncü taraf giriş (Google, Facebook) sunuyorsan **Sign in with Apple da sunmak zorundasın**. Sirius şu an Google sign-in var → Apple sign-in eklemen gerekecek.

Eklemek için:
1. Xcode → Signing & Capabilities → "+" → Sign in with Apple
2. Firebase Auth tarafında Apple provider'ı aktif et
3. `signInWithApple` fonksiyonunu authStore'a ekle (kod değişikliği)

Bu büyük iş, ayrı bir oturumda yapabiliriz. Şimdilik **Apple sign-in olmadan reject olabileceğini bil**.

### 10. Test et — Demo hesap

Apple incelemecileri uygulamayı test edecek. Sirius login zorunluyken **demo bir hesap ver**:

App Store Connect → App Review Information:
- Username: `applereview@sirius.app` (sen oluştur)
- Password: `DemoPass2026!`
- Notes: "Demo account with sample data already loaded"

### 11. Submit for Review

Hepsi hazır olunca → "Submit for Review"

Apple ortalama 24-48 saat içinde karar verir. Reject olursa:
- Eksik metadata
- Crash
- Sign in with Apple eksik (yukarıdaki #9)
- Privacy Policy eksik
- Demo hesap çalışmıyor

Çoğu reject küçük şeylerden olur, düzeltip tekrar submit edersin.

## Yaygın iOS App Store Reject sebepleri (Sirius için risk)

1. **Sign in with Apple eksik** (Guideline 4.8) — Yüksek risk, eklemen lazım
2. **Privacy Policy URL erişilemez** — URL'in 404 vermemesi gerek
3. **Login zorunlu ama uygulamanın değer önerisi anlaşılmıyor** — onboarding ekranında "ne yapan bir uygulama" net olsun
4. **Crash on launch** — Build çalıştığını doğrula
5. **Kullanıcı verilerini silme yolu yok** — Settings'te "Delete my account" butonu önerilir (Guideline 5.1.1(v))
6. **In-app purchase olmadan ücretli içerik açıklaması** — Sirius freemium ise dikkat, şu an sadece free görünüyor

## TestFlight ile yükleme öncesi test

Submit etmeden önce TestFlight'ta dene:
- App Store Connect → TestFlight
- Internal Testing grubu oluştur (kendi Apple ID'n)
- Build'i seç → Test Et

TestFlight'ta crash veya bug bulursan, App Store reject olmadan düzelt.

---

## Bildirimde bulunmam gerekenler

1. **Sign in with Apple eklemen kuvvetle muhtemel reject olmaman için gerekli.** Ben şu an eklemedim çünkü Apple Developer hesabın olmadığı sürece Apple Auth Firebase'e bağlanmaz. Hesabın açıldıktan sonra söyle, ekleyelim.

2. **Hesap silme özelliği eklenmeli.** Apple Guideline 5.1.1(v) gereği. Şu an Sirius'ta yok. Bunu da App Store başvurusu öncesi eklemeliyiz.

3. **Privacy Policy** senin yazman gereken metin. Ben örnek bir taslak hazırlayabilirim ama yayınlamadan önce avukatına/danışmana göstermen iyi olur.

4. **Bundle size 1.36 MB** — App Store limitlerinde sorun yok ama büyük. İleride code splitting ile küçültebiliriz, ama yayın için yeterli.

5. **Statik analiz sonucu:** 134 ESLint warning var ama hiçbiri runtime bug değil. Production build başarılı. Manuel test et: login, pomodoro start/stop, task ekleme, schedule ekleme, profil foto upload — bunların hepsi gerçekten çalışıyor mu kontrol et.

İyi şanslar 🚀
