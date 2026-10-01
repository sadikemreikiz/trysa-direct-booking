import { expect, test, type Page } from "@playwright/test";
import { acceptNextDialog, calendarDay, daysFromToday, pickDay, signInAsStaff } from "./helpers";

type Request = { name: string; room: string; checkin: string; checkout: string };

/** Fills in the English booking form like a guest. */
async function fillRequest(page: Page, { name, room, checkin, checkout }: Request) {
  await page.goto("/en/rezervasyon");
  await page.getByRole("button", { name: room, exact: true }).click();
  await pickDay(page, checkin);
  await pickDay(page, checkout);
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Phone / WhatsApp").fill("+49 151 2345 6789");
  await page.getByRole("checkbox", { name: /I agree that my details/ }).check();
}

test("a guest's request reaches the panel, and once confirmed the nights are booked", async ({
  page,
  context,
}) => {
  // The form ignores anything sent faster than a person could fill it in (a bot trap), so
  // the test lets a few seconds pass on the page's clock before sending.
  const request = {
    name: "Erika Mustermann",
    room: "Ambar-2",
    checkin: daysFromToday(10),
    checkout: daysFromToday(12),
  };
  await page.clock.install();
  await fillRequest(page, request);
  await page.clock.fastForward("00:05");
  await page.getByRole("button", { name: "Send request" }).click();

  await expect(page.getByRole("heading", { name: "Your request is ready!" })).toBeVisible();
  // A request code means it was really stored (the bot trap shows success without one)
  await expect(page.getByText("Request code")).toBeVisible();
  await expect(page.getByText(/^TRY-/)).toBeVisible();

  // The family confirms it in the panel, with the room the guest asked for
  await signInAsStaff(context);
  await page.goto("/panel");
  await page.getByRole("link", { name: /Erika Mustermann/ }).click();
  await expect(page.getByText("misafirin seçtiği")).toBeVisible();
  acceptNextDialog(page);
  await page.getByRole("button", { name: "✓ Onayla · Ambar-2" }).click();
  await expect(page.getByText("✅ Onaylandı · Ambar-2")).toBeVisible();

  // The next guest finds those nights booked and can't pick them
  await page.goto("/en/rezervasyon?unit=ambar-2");
  const firstNight = calendarDay(page, request.checkin);
  for (let i = 0; i < 12 && !(await firstNight.isVisible()); i++) {
    await page.getByRole("button", { name: "Next month" }).click();
  }
  await expect(firstNight).toHaveAccessibleName(/, Booked$/);
  await expect(firstNight).toHaveAttribute("aria-disabled", "true");
});

test("a bot that fills in the hidden field sees success, but nothing is stored", async ({
  page,
  context,
}) => {
  await fillRequest(page, {
    name: "Speedy Bot",
    room: "Ambar-3",
    checkin: daysFromToday(20),
    checkout: daysFromToday(21),
  });
  // Off-screen and hidden from screen readers: only a bot fills in every field
  await page.locator('input[name="website"]').fill("https://spam.example");
  await page.getByRole("button", { name: "Send request" }).click();

  await expect(page.getByRole("heading", { name: "Your request is ready!" })).toBeVisible();
  await expect(page.getByText("Request code")).toHaveCount(0);

  await signInAsStaff(context);
  await page.goto("/panel");
  await expect(page.getByText("Speedy Bot")).toHaveCount(0);
});
