/**
 * Gizlilik politikası / KVKK aydınlatma metni (TR/EN/DE).
 * Sitenin gerçek veri akışını anlatır: rezervasyon formu → veritabanı (Neon, Frankfurt)
 * → e-posta bildirimi (Resend) + panel. Hukuki inceleme önerilir; değişince UPDATED'ı güncelle.
 */
import type { Locale } from "@/i18n-config";

export const PRIVACY_UPDATED = "2026-09-28";
export const PRIVACY_CONTACT = "trysarestaurantcamping@gmail.com";

type Section = { h: string; p: string[] };
type Privacy = { title: string; updated: string; intro: string; sections: Section[] };

export const privacy: Record<Locale, Privacy> = {
  tr: {
    title: "Gizlilik Politikası ve KVKK Aydınlatma Metni",
    updated: "Son güncelleme",
    intro:
      "Trysa Restaurant Camping (Davazlar, Gölbaşı Mevkii, 07572 Demre / Antalya) olarak kişisel verilerinizi 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) ve Avrupa Birliği Genel Veri Koruma Tüzüğü'ne (GDPR) uygun şekilde işliyoruz. Bu metin hangi verileri, neden ve nasıl işlediğimizi açıklar.",
    sections: [
      {
        h: "Hangi verileri topluyoruz?",
        p: [
          "Rezervasyon formu: ad soyad, telefon numarası, isteğe bağlı e-posta adresi, konaklama tarihleri, kişi sayısı, seçilen konaklama ve varsa notunuz. Ayrıca onay verdiğiniz an ve formu hangi dilde doldurduğunuz kaydedilir.",
          "Site kullanımı: çerez kullanmayan, kimliğinizi belirlemeyen ziyaret istatistikleri (hangi sayfaların görüntülendiği, ülke, cihaz türü) ve WhatsApp / telefon butonlarına tıklanma sayısı. IP adresinizi veya cihaz kimliğinizi bu amaçla saklamıyoruz.",
        ],
      },
      {
        h: "Neden işliyoruz? (Amaç ve hukuki sebep)",
        p: [
          "Rezervasyon talebinizi yanıtlamak, müsaitliği teyit etmek ve sizinle iletişim kurmak için. Hukuki sebep: bir sözleşmenin kurulmasıyla doğrudan ilgili olması (KVKK m.5/2-c; GDPR m.6/1-b) ve formda verdiğiniz açık onay.",
          "Sitenin işleyişini iyileştirmek için anonim istatistikler: meşru menfaat (KVKK m.5/2-f; GDPR m.6/1-f).",
        ],
      },
      {
        h: "Verileriniz kimlerle paylaşılır?",
        p: [
          "Verileriniz satılmaz ve reklam amacıyla kullanılmaz. Sadece hizmeti sunabilmemiz için gerekli teknik hizmet sağlayıcılarla paylaşılır: Vercel (site barındırma), Neon (veritabanı — sunucular Frankfurt, Almanya), Resend (işletmeye bildirim e-postası) ve Google (harita, yorumlar). Bu sağlayıcıların bazıları yurt dışında (AB ve ABD) bulunduğundan verileriniz yurt dışına aktarılabilir; bu aktarım yalnızca yukarıdaki amaçlarla ve formda verdiğiniz onaya dayanarak yapılır.",
          "WhatsApp'tan yazmayı seçerseniz o iletişim WhatsApp'ın kendi gizlilik koşullarına tabidir.",
        ],
      },
      {
        h: "Ne kadar süre saklıyoruz?",
        p: [
          "Rezervasyon talepleri, konaklama tarihinden sonra en fazla 2 yıl saklanır ve ardından silinir ya da anonim hâle getirilir. Yasal saklama yükümlülüğü olan kayıtlar (ör. fatura) ilgili mevzuatta belirtilen süre boyunca tutulur.",
        ],
      },
      {
        h: "Çerezler",
        p: [
          "Ziyaretçiler için reklam veya takip çerezi kullanmıyoruz. Yalnızca işletme çalışanlarının yönetim paneline girişini sağlayan zorunlu bir oturum çerezi vardır.",
        ],
      },
      {
        h: "Haklarınız",
        p: [
          "KVKK m.11 ve GDPR kapsamında verilerinizin işlenip işlenmediğini öğrenme, bilgi isteme, düzeltme, silme, işlemeye itiraz etme ve onayınızı geri alma haklarına sahipsiniz. Talebinizi aşağıdaki e-posta adresine iletebilirsiniz; en geç 30 gün içinde yanıtlarız.",
        ],
      },
    ],
  },
  en: {
    title: "Privacy Policy",
    updated: "Last updated",
    intro:
      "Trysa Restaurant Camping (Davazlar, Gölbaşı Mevkii, 07572 Demre / Antalya, Türkiye) processes your personal data in line with the EU General Data Protection Regulation (GDPR) and the Turkish Personal Data Protection Law (KVKK). This notice explains what we collect, why, and how.",
    sections: [
      {
        h: "What we collect",
        p: [
          "Booking form: your name, phone number, optional email address, travel dates, number of guests, chosen accommodation and any note you add. We also record when you gave consent and the language you used.",
          "Site usage: cookie-free statistics that do not identify you (pages viewed, country, device type) and how often the WhatsApp / phone buttons are tapped. We do not store your IP address or device ID for this.",
        ],
      },
      {
        h: "Why we process it (purpose and legal basis)",
        p: [
          "To answer your booking request, confirm availability and contact you — legal basis: steps prior to entering a contract (GDPR Art. 6(1)(b)) and the consent you give in the form.",
          "Anonymous statistics to improve the site — legitimate interest (GDPR Art. 6(1)(f)).",
        ],
      },
      {
        h: "Who we share it with",
        p: [
          "We never sell your data or use it for advertising. It is shared only with the technical providers we need to run the service: Vercel (hosting), Neon (database — servers in Frankfurt, Germany), Resend (notification emails to the business) and Google (maps, reviews). Some providers are located outside Türkiye (EU and USA), so your data may be transferred abroad for these purposes only.",
          "If you choose to message us on WhatsApp, that conversation is subject to WhatsApp's own privacy terms.",
        ],
      },
      {
        h: "How long we keep it",
        p: [
          "Booking requests are kept for at most 2 years after the stay and then deleted or anonymised. Records we are legally required to keep (e.g. invoices) are retained for the period required by law.",
        ],
      },
      {
        h: "Cookies",
        p: [
          "We do not use advertising or tracking cookies for visitors. Only a strictly necessary session cookie is used for staff signing in to the management panel.",
        ],
      },
      {
        h: "Your rights",
        p: [
          "You have the right to access, rectify and erase your data, to object to or restrict processing, to data portability and to withdraw your consent at any time. You may also lodge a complaint with a supervisory authority. Contact us at the address below — we reply within 30 days.",
        ],
      },
    ],
  },
  de: {
    title: "Datenschutzerklärung",
    updated: "Zuletzt aktualisiert",
    intro:
      "Trysa Restaurant Camping (Davazlar, Gölbaşı Mevkii, 07572 Demre / Antalya, Türkei) verarbeitet deine personenbezogenen Daten gemäß der Datenschutz-Grundverordnung (DSGVO) und dem türkischen Datenschutzgesetz (KVKK). Hier erklären wir, welche Daten wir erheben, warum und wie.",
    sections: [
      {
        h: "Welche Daten wir erheben",
        p: [
          "Buchungsformular: Name, Telefonnummer, optional E-Mail-Adresse, Reisedaten, Personenzahl, gewählte Unterkunft und deine Nachricht. Außerdem speichern wir den Zeitpunkt deiner Einwilligung und die verwendete Sprache.",
          "Nutzung der Website: cookiefreie Statistiken ohne Personenbezug (aufgerufene Seiten, Land, Gerätetyp) sowie die Anzahl der Klicks auf WhatsApp / Telefon. IP-Adressen oder Geräte-IDs speichern wir dafür nicht.",
        ],
      },
      {
        h: "Zweck und Rechtsgrundlage",
        p: [
          "Beantwortung deiner Buchungsanfrage, Prüfung der Verfügbarkeit und Kontaktaufnahme — Rechtsgrundlage: vorvertragliche Maßnahmen (Art. 6 Abs. 1 lit. b DSGVO) und deine Einwilligung im Formular.",
          "Anonyme Statistiken zur Verbesserung der Website — berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO).",
        ],
      },
      {
        h: "Weitergabe",
        p: [
          "Wir verkaufen deine Daten nicht und nutzen sie nicht für Werbung. Sie gehen nur an technische Dienstleister, die wir für den Betrieb benötigen: Vercel (Hosting), Neon (Datenbank — Server in Frankfurt), Resend (Benachrichtigungs-E-Mails an den Betrieb) und Google (Karten, Bewertungen). Einige Anbieter sitzen außerhalb der Türkei (EU und USA); eine Übermittlung erfolgt nur zu diesen Zwecken.",
          "Wenn du uns per WhatsApp schreibst, gelten dafür die Datenschutzbestimmungen von WhatsApp.",
        ],
      },
      {
        h: "Speicherdauer",
        p: [
          "Buchungsanfragen werden höchstens 2 Jahre nach dem Aufenthalt gespeichert und dann gelöscht oder anonymisiert. Gesetzlich aufbewahrungspflichtige Unterlagen (z. B. Rechnungen) bewahren wir für die gesetzliche Frist auf.",
        ],
      },
      {
        h: "Cookies",
        p: [
          "Für Besucher verwenden wir keine Werbe- oder Tracking-Cookies. Nur für die Anmeldung von Mitarbeitenden im Verwaltungsbereich gibt es ein technisch notwendiges Sitzungs-Cookie.",
        ],
      },
      {
        h: "Deine Rechte",
        p: [
          "Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Widerspruch, Datenübertragbarkeit sowie auf Widerruf deiner Einwilligung. Außerdem kannst du dich bei einer Datenschutz-Aufsichtsbehörde beschweren. Schreib uns an die unten stehende Adresse — wir antworten innerhalb von 30 Tagen.",
        ],
      },
    ],
  },
};
