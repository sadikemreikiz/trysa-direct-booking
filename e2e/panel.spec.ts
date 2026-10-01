import { expect, test } from "@playwright/test";
import { signInAsStaff } from "./helpers";

test("the panel is closed without signing in", async ({ page }) => {
  await page.goto("/panel");
  await expect(page).toHaveURL(/\/panel\/giris$/);
  await page.goto("/panel/menu");
  await expect(page).toHaveURL(/\/panel\/giris$/);
});

test("staff change a price and mark a dish sold out; guests see it at once", async ({
  page,
  context,
}) => {
  await signInAsStaff(context);
  await page.goto("/panel/menu");

  await page.getByLabel("Köfte fiyatı").fill("555");
  await page.getByRole("button", { name: "Kaydet", exact: true }).click();
  await expect(page.getByText("Fiyat kaydedildi ✓")).toBeVisible();

  const lamb = page.getByRole("listitem").filter({ hasText: "Kuzu Şiş" });
  await lamb.getByRole("button", { name: "Var" }).click();
  await expect(lamb.getByRole("button", { name: "Bugün yok" })).toBeVisible();

  // The German menu, as a guest scanning the table card would see it
  await page.goto("/de/menu");
  const meatballs = page.getByRole("listitem").filter({ hasText: "Gegrillte Hackfleischbällchen" });
  await expect(meatballs).toContainText("555 ₺");
  const lambDe = page.getByRole("listitem").filter({ hasText: "Lammspieß" });
  await expect(lambDe).toContainText("Heute nicht verfügbar");
});
