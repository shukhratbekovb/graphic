import { test, expect } from "@playwright/test";

test("GIP creates and edits; director approves; coordination records completion", async ({
  page,
}) => {
  const suffix = Date.now().toString();
  const title = "E2E — проверка цикла " + suffix;
  const login = async (username: string) => {
    await page.goto("/");
    await page.getByLabel("Логин", { exact: true }).fill(username);
    await page.getByLabel("Пароль", { exact: true }).fill("PirDemo2026!");
    await page.getByRole("button", { name: "Войти в пространство" }).click();
    await expect(
      page.getByRole("heading", { name: "Обзор производства" }),
    ).toBeVisible();
  };
  await login("gip");
  await page
    .getByRole("button", { name: "Создать график", exact: true })
    .click();
  const form = page.getByRole("dialog");
  await form.getByLabel("Наименование вида работ", { exact: true }).fill(title);
  await form.getByLabel("Номер графика", { exact: true }).fill("E2E-" + suffix);
  await form.getByLabel("Сетевая модель", { exact: true }).selectOption("");
  await form
    .getByRole("button", { name: "Создать график", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Работа", exact: true }).click();
  await form
    .getByLabel("Наименование работы", { exact: true })
    .fill("Проверка рабочей документации");
  await form
    .getByLabel("Производственный отдел", { exact: true })
    .fill("Отдел ИССО");
  await form
    .getByLabel("Автор раздела", { exact: true })
    .fill("Тестовый исполнитель");
  await form.getByRole("button", { name: "Применить к черновику" }).click();
  await page.getByRole("button", { name: "Сохранить *", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Изменения сохранены");
  await page
    .getByRole("button", { name: "На утверждение", exact: true })
    .click();
  await expect(
    page.getByText("Ожидает решения назначенного директора."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await login("technical");
  await page.getByText(title, { exact: true }).first().click();
  await page.getByRole("button", { name: "Утвердить", exact: true }).click();
  await expect(
    page.getByText("Утверждённая версия защищена от изменения."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await login("coordinator");
  await page.getByText(title, { exact: true }).first().click();
  await page
    .getByRole("button", { name: /232 Проверка рабочей документации/ })
    .click();
  const effective = await form
    .getByLabel("Дата состояния", { exact: true })
    .inputValue();
  await form.getByLabel("Готовность, %", { exact: true }).fill("100");
  await form.getByLabel("Фактическое начало", { exact: true }).fill(effective);
  await form
    .getByLabel("Фактическое окончание", { exact: true })
    .fill(effective);
  await form
    .getByRole("button", { name: "Сохранить факт", exact: true })
    .click();
  await expect(page.locator(".schedule-summary")).toContainText("100%");
  await page
    .getByRole("button", { name: "Отчёты и загрузка", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Сохранить снимок", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("Снимок отчёта сохранён");
  await page
    .getByRole("button", { name: "Сохранённые снимки", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Зафиксированные отчёты" }),
  ).toBeVisible();
  await expect(page.locator(".snapshot-row")).not.toHaveCount(0);
});
