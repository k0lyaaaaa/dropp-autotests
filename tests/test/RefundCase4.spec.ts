import { test, Page, Locator, expect } from "@playwright/test";
import { AuthDMSFin, loginAsUser } from "../helpers/auth";
import { SaveLastOrder, savedOrderNumber } from "../helpers/saveLastOrder";
import { openReturnsSection } from "../helpers/createRefundAllReason";

test('Создание возврата по 3 товарам', async ({ page, request }) => {
  test.setTimeout(120000);

  // 1. Авторизация в UI
  await loginAsUser(page);
  
  // 2. Получаем номер последнего заказа
  await SaveLastOrder(page);
  console.log(`📦 Номер заказа из UI: ${savedOrderNumber}`);

  // 3. Авторизация в админке
  await AuthDMSFin(page);
  await page.waitForTimeout(3000);

  // 4. Поиск заказа
  const searchInput = page.locator('input[placeholder="Поиск"]');
  await searchInput.waitFor({ state: 'visible', timeout: 10000 });
  await searchInput.fill(savedOrderNumber);
  console.log('✅ Поиск: значение введено');

  // 5. Нажимаем кнопку поиска
  const searchButton = page.locator('[data-testid="SearchIcon"]');
  await searchButton.waitFor({ state: 'visible', timeout: 10000 });
  await searchButton.click();
  console.log('✅ Поиск выполнен');

  // 6. Открываем заказ
  await page.locator(`a:has-text("${savedOrderNumber}")`).first().click();
  console.log(`✅ Открыт заказ ${savedOrderNumber}`);

  // 7. Открываем раздел возвратов
  await openReturnsSection(page);
  console.log('✅ Открыт раздел возвратов');

  // 8. Ждём загрузки контейнера и скроллера
  let refundContainer = page
    .locator('div[legend="Вернуть ДС потоварно"]')
    .first();
  await refundContainer.waitFor({ state: "visible", timeout: 10000 }); 
  console.log('✅ Контейнер возвратов загружен');

  let tableScroller = refundContainer
    .locator(".MuiDataGrid-virtualScroller")
    .first();
  await tableScroller.waitFor({ state: "visible", timeout: 10000 });
  console.log('✅ Скроллер возвратов загружен');

  // 9. Проверяем, что в контейнере есть 3 товара
  const totalCheckboxes = await refundContainer.locator('input[name="select_row"]').count();
  expect(totalCheckboxes).toBeGreaterThanOrEqual(3);
  console.log(`✅ В контейнере есть ${totalCheckboxes} товаров`);

  // Находим контейнер возвратов
const refundContainer1 = page.locator('div[legend="Вернуть ДС потоварно"]').first();

// Чекбокс "Выбрать все" внутри этого контейнера
// Находим чекбокс "Выбрать все"
const selectAllInput = refundContainer.locator('input[name="select_all_rows"]').first();

// Находим его родительский кликабельный элемент
const selectAllParent = selectAllInput.locator('xpath=ancestor::span[contains(@class, "MuiCheckbox-root")]').first();

// Кликаем по родителю
await selectAllParent.click();
console.log("✅ Выбраны все строки в разделе возвратов");
await page.waitForTimeout(2000);
  // 11. Нажимаем кнопку «Заполнить заявку на возврат ДС»
  const fillButton = page.locator('button:has-text("Заполнить заявку на возврат ДС")').first();
  await fillButton.click();
  console.log('✅ Нажата кнопку «Заполнить заявку на возврат ДС»');

  // 12. Удаляем 1 товар
  const deleteProductButton = page.locator('button[aria-label="Удалить товар"]').first();
  await deleteProductButton.click();
  console.log("✅ Товар удалён");
  await page.waitForTimeout(2000);

  // 13. Выбираем разные причины для каждого из 2 оставшихся товаров
  const reasonSelects = page.locator('.MuiSelect-select.css-ljcffu');

  // Товар 1: причина "Не подошло"
  await reasonSelects.nth(0).click();
  await page.locator('li[role="option"]:has-text("Не подошло")').first().click();
  console.log('✅ Товар 1: выбрана причина "Не подошло"');

  // Товар 2: причина "Отсутствует в наличии"
  await reasonSelects.nth(1).click();
  await page.locator('li[role="option"]:has-text("Отсутствует в наличии")').first().click();
  console.log('✅ Товар 2: выбрана причина "Отсутствует в наличии"');

  // 15. Нажимаем кнопку «Отправить заявку менеджеру»
  const sendButton = page.locator('button:has-text("Отправить заявку менеджеру")').first();
  await sendButton.click();
  console.log('✅ Нажата кнопка «Отправить заявку менеджеру»');
  await page.waitForTimeout(2000);

  // Проверка: при разных причинах (не все "Не подошло") — 2500 НЕ должна появляться
  const fixedLogisticsElement = page
    .locator('p:has-text("Фиксированная стоимость обратной логистики")')
    .first();
  await expect(fixedLogisticsElement).not.toBeVisible({ timeout: 5000 });
  console.log('✅ Фиксированная стоимость обратной логистики не отображается — причины разные, 2500 не списывается');

  // 16. Нажимаем кнопку «Подтвердить заявку»
  const confirmButtonRefund = page.locator('button:has-text("Подтвердить заявку")').first();
  await confirmButtonRefund.click();
  console.log('✅ Нажата кнопку «Подтвердить заявку»');

  // 17. Нажимаем кнопку «Провести возврат ДС»
  const refundButton = page.locator('button:has-text("Провести возврат ДС")').first();
  await refundButton.click();
  console.log('✅ Нажата кнопку «Провести возврат ДС»');

  // 18. Нажимаем кнопку «Подтвердить»
  const confirmButton = page.locator('button:has-text("Подтвердить")').first();
  await confirmButton.click();
  console.log('✅ Нажата кнопку «Подтвердить»');

  // 19. Проверяем, статус "Проведен"
  const status = page.locator('span:has-text("Проведен")').first();
  await status.waitFor({ state: 'visible', timeout: 10000 });
  console.log('✅ Статус "Проведен"');

});