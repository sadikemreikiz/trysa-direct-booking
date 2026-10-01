/**
 * The restaurant menu in the database: what the public menu page shows and what staff edit
 * in the panel. Category keys and their order come from the printed menu.
 */
import { asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { menu as printedMenu, type MenuCategory, type MenuItem } from "@/content/menu";
import type { Db } from "@/db";
import { menuItems } from "@/db/schema";

export const MENU_CATEGORIES = printedMenu.map((c) => c.cat) as [string, ...string[]];

type Row = typeof menuItems.$inferSelect;

function toMenuItem(row: Row): MenuItem {
  const hasDescription = row.descTr || row.descEn || row.descDe;
  return {
    id: row.id,
    n: row.nameTr,
    // Untranslated items show the Turkish name
    en: row.nameEn || row.nameTr,
    de: row.nameDe || row.nameTr,
    p: String(row.price),
    available: row.available,
    ...(hasDescription
      ? {
          d: {
            tr: row.descTr ?? "",
            en: row.descEn || row.descTr || "",
            de: row.descDe || row.descTr || "",
          },
        }
      : {}),
  };
}

/** Rows grouped by category in printed-menu order; unknown categories go last. */
function group(rows: Row[]): MenuCategory[] {
  const order = (cat: string) => {
    const i = MENU_CATEGORIES.indexOf(cat);
    return i === -1 ? MENU_CATEGORIES.length : i;
  };
  const cats = [...new Set(rows.map((r) => r.category))].sort((a, b) => order(a) - order(b));
  return cats.map((cat) => ({
    cat,
    items: rows.filter((r) => r.category === cat).map(toMenuItem),
  }));
}

async function rows(db: Db): Promise<Row[]> {
  return db.select().from(menuItems).orderBy(asc(menuItems.position), asc(menuItems.id));
}

/**
 * The menu the site shows. Without a database, or if it can't be read, the printed menu
 * from the site content is shown instead, so the page is never empty.
 */
export async function getMenu(db: Db | null): Promise<MenuCategory[]> {
  if (!db) return printedMenu;
  try {
    const all = await rows(db);
    return all.length ? group(all) : printedMenu;
  } catch (e) {
    console.error("Failed to read the menu, showing the printed menu", e);
    return printedMenu;
  }
}

/** The menu with database ids, for the staff panel. */
export async function getMenuForPanel(db: Db): Promise<MenuCategory[]> {
  return group(await rows(db));
}

/** Optional text: missing or blank becomes null. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

export const menuItemInput = z.object({
  category: z.enum(MENU_CATEGORIES),
  nameTr: z.string().trim().min(1).max(80),
  nameEn: optionalText(80),
  nameDe: optionalText(80),
  descTr: optionalText(200),
  descEn: optionalText(200),
  descDe: optionalText(200),
  price: z.coerce.number().int().min(1).max(99_999),
});
export type MenuItemInput = z.input<typeof menuItemInput>;

export const priceInput = z.coerce.number().int().min(1).max(99_999);

export class MenuItemNotFound extends Error {}

/** Ids arrive from the browser through server actions, so they are checked too. */
const itemId = z.number().int().positive();

async function update(db: Db, id: number, values: Partial<typeof menuItems.$inferInsert>) {
  itemId.parse(id);
  const [row] = await db
    .update(menuItems)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(menuItems.id, id))
    .returning({ id: menuItems.id });
  if (!row) throw new MenuItemNotFound();
}

export async function setPrice(db: Db, id: number, price: number, actor: string) {
  return update(db, id, { price: priceInput.parse(price), updatedBy: actor });
}

export async function setAvailable(db: Db, id: number, available: boolean, actor: string) {
  return update(db, id, { available: z.boolean().parse(available), updatedBy: actor });
}

export async function editMenuItem(db: Db, id: number, input: MenuItemInput, actor: string) {
  return update(db, id, { ...menuItemInput.parse(input), updatedBy: actor });
}

/** Adds an item at the end of its category. */
export async function addMenuItem(db: Db, input: MenuItemInput, actor: string) {
  const values = menuItemInput.parse(input);
  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${menuItems.position}) + 1, 0)` })
    .from(menuItems)
    .where(eq(menuItems.category, values.category));
  const [row] = await db
    .insert(menuItems)
    .values({ ...values, position: Number(next), updatedBy: actor })
    .returning({ id: menuItems.id });
  return row.id;
}

export async function deleteMenuItem(db: Db, id: number) {
  itemId.parse(id);
  const deleted = await db
    .delete(menuItems)
    .where(eq(menuItems.id, id))
    .returning({ id: menuItems.id });
  if (!deleted.length) throw new MenuItemNotFound();
}
