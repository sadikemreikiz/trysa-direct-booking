/**
 * Privacy policy / KVKK notice (TR/EN/DE).
 * Describes the site's real data flow: booking form → database (Neon, Frankfurt)
 * → email notification (Resend) + panel. Legal review recommended; update UPDATED when it changes.
 */
import type { Locale } from "@/lib/i18n";

export const PRIVACY_UPDATED = "2026-10-01";
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
          "Kötüye kullanımı (spam) önlemek: formu ve butonları aşırı sık kullanan otomatik programları durdurmak için IP adresinizin geri çevrilemeyen şifreli bir özeti en fazla 2 gün tutulur, sonra silinir. IP adresinizin kendisi saklanmaz ve bu kayıt başka bir amaçla kullanılmaz (hukuki sebep: meşru menfaat).",
        ],
      },
      {
        h: "Neden işliyoruz? (Amaç ve hukuki sebep)",
        p: [
          "Rezervasyon talebinizi yanıtlamak, müsaitliği teyit etmek ve sizinle iletişim kurmak için. Hukuki sebep: bir sözleşmenin kurulmasıyla doğrudan ilgili olması (KVKK m.5/2-c; GDPR m.6/1-b) ve formda verdiğiniz açık onay.",
          "E-posta adresinizi verdiyseniz, konaklamanızla ilgili bilgilendirme e-postaları: talebinizin alındığı, rezervasyonunuzun onaylandığı ve varışınızdan bir gün önce yol tarifi ile giriş bilgileri. Hukuki sebep: sözleşmenin ifası (KVKK m.5/2-c; GDPR m.6/1-b).",
          "Konaklamanızdan sonra deneyiminizi soran tek bir e-posta: yalnızca formda bu kutuyu ayrıca işaretlediyseniz gönderilir. Hukuki sebep: açık rızanız (KVKK m.5/1; GDPR m.6/1-a); rızanızı istediğiniz zaman geri alabilirsiniz.",
          "Sitedeki yapay zekâ asistanını kullanırsanız: sorularınızı yanıtlamak ve müsaitliğe bakmak için yazdıklarınız Anthropic'in Claude modeline iletilir. Asistanı iyileştirmek için konuşmalar, içindeki e-posta adresleri ve telefon numaraları maskelenerek 30 gün saklanır ve sonra silinir; bir rezervasyonla ya da IP adresinizle ilişkilendirilmez. Hukuki sebep: talebiniz üzerine işlem (KVKK m.5/2-c; GDPR m.6/1-b) ve hizmeti iyileştirmede meşru menfaat (KVKK m.5/2-f; GDPR m.6/1-f). Asistana hassas kişisel bilgi yazmamanızı rica ederiz.",
          "Sitenin işleyişini iyileştirmek için anonim istatistikler: meşru menfaat (KVKK m.5/2-f; GDPR m.6/1-f).",
        ],
      },
      {
        h: "Verileriniz kimlerle paylaşılır?",
        p: [
          "Verileriniz satılmaz ve reklam amacıyla kullanılmaz. Sadece hizmeti sunabilmemiz için gerekli teknik hizmet sağlayıcılarla paylaşılır: Vercel (site barındırma), Neon (veritabanı — sunucular Frankfurt, Almanya), Resend (işletmeye bildirim ve size gönderilen rezervasyon e-postaları) Anthropic (yapay zekâ asistanı, ABD) ve Google (harita, yorumlar). Bu sağlayıcıların bazıları yurt dışında (AB ve ABD) bulunduğundan verileriniz yurt dışına aktarılabilir; bu aktarım yalnızca yukarıdaki amaçlarla ve formda verdiğiniz onaya dayanarak yapılır.",
          "WhatsApp'tan yazmayı seçerseniz o iletişim WhatsApp'ın kendi gizlilik koşullarına tabidir.",
        ],
      },
      {
        h: "Ne kadar süre saklıyoruz?",
        p: [
          "Rezervasyon talepleri, konaklama tarihinden sonra en fazla 2 yıl saklanır ve ardından silinir ya da anonim hâle getirilir. Yasal saklama yükümlülüğü olan kayıtlar (ör. fatura) ilgili mevzuatta belirtilen süre boyunca tutulur.",
          "Yapay zekâ asistanıyla yapılan konuşmalar, son mesajdan 30 gün sonra silinir.",
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
          "Abuse (spam) prevention: to stop automated programs that submit the form or tap the buttons excessively, a non-reversible encrypted digest of your IP address is kept for at most 2 days and then deleted. Your IP address itself is not stored and this record is not used for any other purpose (legal basis: legitimate interest).",
        ],
      },
      {
        h: "Why we process it (purpose and legal basis)",
        p: [
          "To answer your booking request, confirm availability and contact you — legal basis: steps prior to entering a contract (GDPR Art. 6(1)(b)) and the consent you give in the form.",
          "If you give an email address, emails about your stay: that we received your request, that your booking is confirmed, and directions with arrival details the day before you arrive — legal basis: performance of a contract (GDPR Art. 6(1)(b)).",
          "One email after your stay asking about your experience, only if you ticked that separate box in the form — legal basis: your consent (GDPR Art. 6(1)(a)), which you can withdraw at any time.",
          "If you use the AI assistant on the site: what you write is sent to Anthropic's Claude model to answer your questions and check availability. To improve the assistant, conversations are kept for 30 days with email addresses and phone numbers masked, then deleted; they are not linked to a booking or to your IP address. Legal basis: steps taken at your request (GDPR Art. 6(1)(b)) and our legitimate interest in improving the service (GDPR Art. 6(1)(f)). Please don't share sensitive personal information with the assistant.",
          "Anonymous statistics to improve the site — legitimate interest (GDPR Art. 6(1)(f)).",
        ],
      },
      {
        h: "Who we share it with",
        p: [
          "We never sell your data or use it for advertising. It is shared only with the technical providers we need to run the service: Vercel (hosting), Neon (database — servers in Frankfurt, Germany), Resend (notifications to the business and booking emails to you) Anthropic (AI assistant, USA) and Google (maps, reviews). Some providers are located outside Türkiye (EU and USA), so your data may be transferred abroad for these purposes only.",
          "If you choose to message us on WhatsApp, that conversation is subject to WhatsApp's own privacy terms.",
        ],
      },
      {
        h: "How long we keep it",
        p: [
          "Booking requests are kept for at most 2 years after the stay and then deleted or anonymised. Records we are legally required to keep (e.g. invoices) are retained for the period required by law.",
          "Conversations with the AI assistant are deleted 30 days after the last message.",
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
          "Schutz vor Missbrauch (Spam): Um automatisierte Programme zu stoppen, die das Formular oder die Buttons übermäßig nutzen, wird ein nicht umkehrbarer verschlüsselter Hashwert deiner IP-Adresse höchstens 2 Tage gespeichert und dann gelöscht. Deine IP-Adresse selbst wird nicht gespeichert und dieser Eintrag für keinen anderen Zweck verwendet (Rechtsgrundlage: berechtigtes Interesse).",
        ],
      },
      {
        h: "Zweck und Rechtsgrundlage",
        p: [
          "Beantwortung deiner Buchungsanfrage, Prüfung der Verfügbarkeit und Kontaktaufnahme — Rechtsgrundlage: vorvertragliche Maßnahmen (Art. 6 Abs. 1 lit. b DSGVO) und deine Einwilligung im Formular.",
          "Wenn du eine E-Mail-Adresse angibst, E-Mails zu deinem Aufenthalt: dass deine Anfrage eingegangen ist, dass deine Buchung bestätigt ist, und am Tag vor der Anreise Anfahrt und Anreiseinfos — Rechtsgrundlage: Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO).",
          "Eine E-Mail nach deinem Aufenthalt mit der Frage nach deinen Eindrücken, nur wenn du das eigene Kästchen im Formular angekreuzt hast — Rechtsgrundlage: deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO), die du jederzeit widerrufen kannst.",
          "Wenn du den KI-Assistenten auf der Website nutzt: Was du schreibst, wird an das Claude-Modell von Anthropic übermittelt, um deine Fragen zu beantworten und die Verfügbarkeit zu prüfen. Zur Verbesserung des Assistenten speichern wir Unterhaltungen 30 Tage lang, mit unkenntlich gemachten E-Mail-Adressen und Telefonnummern, und löschen sie dann; sie werden weder mit einer Buchung noch mit deiner IP-Adresse verknüpft. Rechtsgrundlage: Maßnahmen auf deine Anfrage (Art. 6 Abs. 1 lit. b DSGVO) und unser berechtigtes Interesse an der Verbesserung des Angebots (Art. 6 Abs. 1 lit. f DSGVO). Bitte teile dem Assistenten keine sensiblen persönlichen Daten mit.",
          "Anonyme Statistiken zur Verbesserung der Website — berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO).",
        ],
      },
      {
        h: "Weitergabe",
        p: [
          "Wir verkaufen deine Daten nicht und nutzen sie nicht für Werbung. Sie gehen nur an technische Dienstleister, die wir für den Betrieb benötigen: Vercel (Hosting), Neon (Datenbank — Server in Frankfurt), Resend (Benachrichtigungen an den Betrieb und Buchungs-E-Mails an dich) Anthropic (KI-Assistent, USA) und Google (Karten, Bewertungen). Einige Anbieter sitzen außerhalb der Türkei (EU und USA); eine Übermittlung erfolgt nur zu diesen Zwecken.",
          "Wenn du uns per WhatsApp schreibst, gelten dafür die Datenschutzbestimmungen von WhatsApp.",
        ],
      },
      {
        h: "Speicherdauer",
        p: [
          "Buchungsanfragen werden höchstens 2 Jahre nach dem Aufenthalt gespeichert und dann gelöscht oder anonymisiert. Gesetzlich aufbewahrungspflichtige Unterlagen (z. B. Rechnungen) bewahren wir für die gesetzliche Frist auf.",
          "Unterhaltungen mit dem KI-Assistenten werden 30 Tage nach der letzten Nachricht gelöscht.",
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
