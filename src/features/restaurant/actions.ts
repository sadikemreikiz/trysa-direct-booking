"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import type { Db } from "@/db";
import { requireApprovedStaff } from "@/features/panel/session";
import {
  addMenuItem,
  deleteMenuItem,
  editMenuItem,
  MenuItemNotFound,
  setAvailable,
  setPrice,
  type MenuItemInput,
} from "./menu-store";

export type MenuActionResult = { ok: true } | { ok: false; error: string };

/** Runs a menu change for a signed-in, approved staff member and refreshes the public menu. */
async function run(change: (db: Db, actor: string) => Promise<unknown>): Promise<MenuActionResult> {
  const { db, staff } = await requireApprovedStaff();
  try {
    await change(db, `user:${staff.userId}`);
  } catch (e) {
    if (e instanceof ZodError)
      return { ok: false, error: "Bilgileri kontrol et: ad boş olamaz, fiyat tam sayı olmalı." };
    if (e instanceof MenuItemNotFound)
      return { ok: false, error: "Bu yemek bulunamadı (belki az önce silindi)." };
    throw e;
  }
  revalidatePath("/[lang]/menu", "page");
  revalidatePath("/panel/menu");
  return { ok: true };
}

export async function setPriceAction(id: number, price: number) {
  return run((db, actor) => setPrice(db, id, price, actor));
}

export async function setAvailableAction(id: number, available: boolean) {
  return run((db, actor) => setAvailable(db, id, available, actor));
}

export async function editMenuItemAction(id: number, input: MenuItemInput) {
  return run((db, actor) => editMenuItem(db, id, input, actor));
}

export async function addMenuItemAction(input: MenuItemInput) {
  return run((db, actor) => addMenuItem(db, input, actor));
}

export async function deleteMenuItemAction(id: number) {
  return run((db) => deleteMenuItem(db, id));
}
