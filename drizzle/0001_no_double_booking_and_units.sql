-- Çift rezervasyonu veritabanı seviyesinde imkânsız kıl:
-- aynı ünitede tarih aralıkları çakışan iki ONAYLI rezervasyon olamaz.
-- Aralık [giriş, çıkış) — çıkış günü bir sonraki misafirin giriş günü olabilir.
-- Bekleyen (pending) talepler çakışabilir; aile hangisini onaylayacağını seçer.
-- Kamp alanı (id 7) ortak alan: aynı anda birden çok çadır/karavan olabilir, kurala dahil değil.
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
ALTER TABLE "reservations"
  ADD CONSTRAINT "reservations_no_overlap_confirmed"
  EXCLUDE USING gist (
    "unit_id" WITH =,
    daterange("check_in", "check_out", '[)') WITH &&
  ) WHERE ("status" = 'confirmed' AND "unit_id" <> 7);--> statement-breakpoint

-- Referans veri: konaklama üniteleri (slug'lar sitedeki /oda/[slug] adresleriyle aynı).
INSERT INTO "units" ("id", "slug", "name", "kind", "sort_order") VALUES
  (1, 'ambar-1',    'Ambar-1',              'room',       1),
  (2, 'ambar-2',    'Ambar-2',              'room',       2),
  (3, 'ambar-3',    'Ambar-3',              'room',       3),
  (4, 'kulube-1',   'Kulübe-1',             'room',       4),
  (5, 'kulube-2',   'Kulübe-2',             'room',       5),
  (6, 'tiny-house', 'Tiny House',           'tiny_house', 6),
  (7, 'kamp',       'Kamp & Karavan Alanı', 'camp',       7);
