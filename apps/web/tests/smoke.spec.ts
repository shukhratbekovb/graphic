import { test, expect } from "@playwright/test";

test("login, dashboard, custom Gantt, reports and mobile viewport", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByLabel("Логин", { exact: true }).fill("gip");
  await page.getByLabel("Пароль", { exact: true }).fill("PirDemo2026!");
  await page.getByRole("button", { name: "Войти в пространство" }).click();
  await expect(
    page.getByRole("heading", { name: "Обзор производства" }),
  ).toBeVisible();
  await expect(
    page.getByText("Пролётные строения", { exact: true }).first(),
  ).toBeVisible();
  await page.screenshot({
    path: "../../docs/acceptance/dashboard.png",
    fullPage: true,
  });
  await page.getByText("Пролётные строения", { exact: true }).first().click();
  await expect(
    page.getByRole("heading", { name: "График выполнения" }),
  ).toBeVisible();
  await expect(page.locator(".task-bar")).toHaveCount(7);
  await expect(page.locator(".dependency-layer path").last()).toBeVisible();
  await page.screenshot({
    path: "../../docs/acceptance/gantt.png",
    fullPage: true,
  });
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Excel / А4" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("pir-schedule.xlsx");
  await page
    .getByRole("button", { name: "Отчёты и загрузка", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Отчёты и загрузка" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "По специальностям", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Распределение стоимости по специальностям",
    }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Обзор производства", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Обзор производства" }),
  ).toBeVisible();
  await page.screenshot({
    path: "../../docs/acceptance/mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
