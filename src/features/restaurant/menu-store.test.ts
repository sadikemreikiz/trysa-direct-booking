import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { menu as printedMenu } from "@/content/menu";
import type { Db } from "@/db";
import { createTestDb } from "@/db/test-db";
import {
  addMenuItem,
  deleteMenuItem,
  editMenuItem,
  getMenu,
  getMenuForPanel,
  MenuItemNotFound,
  setAvailable,
  setPrice,
} from "./menu-store";

let db: Db;
let client: PGlite;

beforeAll(async () => {
  ({ db, client } = await createTestDb());
});
afterAll(async () => {
  await client.close();
});

const find = async (name: string) =>
  (await getMenu(db)).flatMap((c) => c.items).find((i) => i.n === name)!;

describe("menu in the database", () => {
  it("starts as the printed menu (seeded by migration 0007), same order and prices", async () => {
    const menu = await getMenu(db);
    expect(menu.map((c) => c.cat)).toEqual(printedMenu.map((c) => c.cat));
    const simplify = (m: typeof menu) =>
      m.flatMap((c) => c.items.map((i) => [c.cat, i.n, i.en, i.de, i.p, i.d ?? null]));
    expect(simplify(menu)).toEqual(simplify(printedMenu));
  });

  it("shows the printed menu when there is no database", async () => {
    expect(await getMenu(null)).toBe(printedMenu);
  });

  it("staff change prices and mark dishes unavailable for today", async () => {
    const lamb = await find("Kuzu Şiş");
    await setPrice(db, lamb.id!, 690, "user:u1");
    await setAvailable(db, lamb.id!, false, "user:u1");
    expect(await find("Kuzu Şiş")).toMatchObject({ p: "690", available: false });
  });

  it("rejects prices that can't be right", async () => {
    const lamb = await find("Kuzu Şiş");
    await expect(setPrice(db, lamb.id!, 0, "user:u1")).rejects.toThrow();
    await expect(setPrice(db, lamb.id!, 12.5, "user:u1")).rejects.toThrow();
    await expect(setPrice(db, 99_999, 100, "user:u1")).rejects.toBeInstanceOf(MenuItemNotFound);
  });

  it("adds a dish at the end of its category; missing translations show the Turkish name", async () => {
    await addMenuItem(
      db,
      { category: "Izgaralar", nameTr: "Adana Kebap", price: "620" },
      "user:u1",
    );
    const grills = (await getMenu(db)).find((c) => c.cat === "Izgaralar")!;
    expect(grills.items.at(-1)).toMatchObject({
      n: "Adana Kebap",
      en: "Adana Kebap",
      de: "Adana Kebap",
      p: "620",
    });
  });

  it("edits names and descriptions, and deletes dishes", async () => {
    const adana = await find("Adana Kebap");
    await editMenuItem(
      db,
      adana.id!,
      {
        category: "Izgaralar",
        nameTr: "Adana Kebap",
        nameEn: "Adana kebab",
        descEn: "Spicy minced lamb",
        price: 620,
      },
      "user:u1",
    );
    expect(await find("Adana Kebap")).toMatchObject({
      en: "Adana kebab",
      d: { en: "Spicy minced lamb" },
    });
    await deleteMenuItem(db, adana.id!);
    expect(await find("Adana Kebap")).toBeUndefined();
  });

  it("rejects unknown categories and empty names", async () => {
    await expect(
      addMenuItem(db, { category: "Pizza", nameTr: "Margherita", price: 300 }, "user:u1"),
    ).rejects.toThrow();
    await expect(
      addMenuItem(db, { category: "Izgaralar", nameTr: "  ", price: 300 }, "user:u1"),
    ).rejects.toThrow();
  });

  it("the panel sees every dish with its id", async () => {
    const all = (await getMenuForPanel(db)).flatMap((c) => c.items);
    expect(all.every((i) => typeof i.id === "number")).toBe(true);
  });
});
