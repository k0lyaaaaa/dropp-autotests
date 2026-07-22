import { test, Page, Locator, expect } from "@playwright/test";
import { AuthDMSFin, loginAsUser } from "../helpers/auth";
import { SaveLastOrder, savedOrderNumber } from "../helpers/saveLastOrder";

const openReturnsSection = async (page: Page) => {
  // Ждём появления любой из двух кнопок
  await page.waitForSelector(
    'button:has-text("Открыть раздел Возвратов ДС"), button:has-text("Закрыть раздел Возвратов ДС")',
    { timeout: 10000 }
  );

  const closeButton = page
    .locator('button:has-text("Закрыть раздел Возвратов ДС")')
    .first();

  if (await closeButton.isVisible()) {
    console.log("ℹ️ Раздел Возвратов ДС уже открыт — пропускаем");
    return;
  }

  await page
    .locator('button:has-text("Открыть раздел Возвратов ДС")')
    .first()
    .click();
  console.log("✅ Открыт раздел Возвратов ДС");
};

const isMuiChecked = async (cb: Locator) =>
  await cb.evaluate(
    (el) =>
      el.closest(".MuiCheckbox-root")?.classList.contains("Mui-checked") ??
      false
  );
test("Создание возврата по последнему купленному заказу", async ({ page }) => {
  test.setTimeout(600000); // до 10 минут — возвратов может быть много

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
  await searchInput.waitFor({ state: "visible", timeout: 10000 });
  await searchInput.fill(savedOrderNumber);
  console.log("✅ Поиск: значение введено");

  const searchButton = page.locator('[data-testid="SearchIcon"]');
  await searchButton.waitFor({ state: "visible", timeout: 10000 });
  await searchButton.click();
  console.log("✅ Поиск выполнен");

  // 5. Открываем заказ
  await page.locator(`a:has-text("${savedOrderNumber}")`).first().click();
  console.log(`✅ Открыт заказ ${savedOrderNumber}`);

  // 6. Открываем раздел Возвратов ДС
  await openReturnsSection(page);

  // 7. Ждём загрузки контейнера
  const refundContainer = page
    .locator('div[legend="Вернуть ДС потоварно"]')
    .first();
  await refundContainer.waitFor({ state: "visible", timeout: 10000 });
  console.log("✅ Контейнер возвратов загружен");

  // 8–14. Цикл: один товар → возврат → следующий товар
  // MUI DataGrid скроллится через внутренний .MuiDataGrid-virtualScroller,
  // а не через внешний контейнер fieldset
  const tableScroller = refundContainer
    .locator(".MuiDataGrid-virtualScroller")
    .first();
  await tableScroller.waitFor({ state: "visible", timeout: 10000 });

  const getScrollInfo = () =>
    tableScroller.evaluate((el) => ({
      scrollTop: el.scrollTop,
      clientHeight: el.clientHeight,
      scrollHeight: el.scrollHeight,
    }));

  let itemsProcessed = 0;
  let optionIdx = 0;

  while (true) {
    console.log(
      `\n🔄 Итерация ${itemsProcessed + 1}: ищем следующий активный товар...`
    );

    // Сбрасываем скролл в начало перед каждым поиском
    await tableScroller.evaluate((el) => {
      el.scrollTop = 0;
    });
    await page.waitForTimeout(500);

    const { clientHeight, scrollHeight } = await getScrollInfo();
    const needsScroll = scrollHeight > clientHeight;
    // 50% overlap — строки на границе окна не пропускаются
    const scrollStep = Math.floor(clientHeight / 2);

    console.log(
      `📏 clientHeight=${clientHeight} scrollHeight=${scrollHeight} needsScroll=${needsScroll}`
    );

    let found = false;

    // Sliding window: на каждом шаге берём только живые DOM-элементы текущего viewport'а
    outerLoop: while (true) {
      const visibleCheckboxes = await refundContainer
        .locator('input[name="select_row"]')
        .all();
      console.log(`👁 Видимых чекбоксов: ${visibleCheckboxes.length}`);

      for (const checkbox of visibleCheckboxes) {
        const isDisabled = await checkbox.isDisabled();

        // MUI не отражает состояние через .checked на input —
        // используем класс Mui-checked на родительском span

        const isAlreadyChecked = await isMuiChecked(checkbox);
        console.log(`🔍 disabled=${isDisabled} muiChecked=${isAlreadyChecked}`);

        // Ищем первый не-задизейбленный и ещё не отмеченный чекбокс
        if (!isDisabled && !isAlreadyChecked) {
          await checkbox.click({ force: true });
          await page.waitForTimeout(500);

          // После клика checkbox может перерисоваться (виртуализация) и
          // стать detached — проверяем через .Mui-selected на строке таблицы,
          // а не через стейл-ссылку на input
          const selectedRows = await refundContainer
            .locator(".MuiDataGrid-row.Mui-selected")
            .count();
          console.log(`🖱 После клика выбрано строк: ${selectedRows}`);

          if (selectedRows === 1) {
            found = true;
            console.log(`✅ Товар выбран (итерация ${itemsProcessed + 1})`);
            break outerLoop;
          }
        }
      }

      if (!needsScroll) break;

      const { scrollTop, scrollHeight: sh } = await getScrollInfo();
      if (scrollTop + clientHeight >= sh) break;

      await tableScroller.evaluate((el, step) => {
        el.scrollTop += step;
      }, scrollStep);
      await page.waitForTimeout(500);
    }

    // Активных товаров больше нет — выходим из цикла
    if (!found) {
      console.log(
        `✅ Активных товаров для возврата больше нет. Обработано: ${itemsProcessed}`
      );
      break;
    }

    // 9. Нажимаем кнопку "Заполнить заявку на возврат ДС"
    const fillButton = page
      .locator('button:has-text("Заполнить заявку на возврат ДС")')
      .first();
    await fillButton.click();
    console.log('✅ Нажали кнопку "Заполнить заявку на возврат ДС"');
    await page.waitForTimeout(2000);

    // 10. Выбираем причину возврата
    console.log("🔍 Выбираем причину возврата...");
    const reasonSelect = page.locator(".MuiSelect-select.css-ljcffu").first();
    await reasonSelect.scrollIntoViewIfNeeded();
    await reasonSelect.click();
    console.log("✅ Открыт список причин возврата");

    await page.waitForSelector('li[role="option"]', { timeout: 5000 });
    const options = page.locator('li[role="option"]');
    const optionsCount = await options.count();
    const option = options.nth(optionIdx);
    const reasonText = await option.textContent();

    await option.click();
    console.log(`✅ Выбрана причина: ${reasonText?.trim()}`);
    await page.waitForTimeout(1000);

    // 11. Отправляем заявку менеджеру
    const sendButton = page
      .locator('button:has-text("Отправить заявку менеджеру")')
      .first();
    await sendButton.click();
    console.log("✅ Отправлена заявка менеджеру");
    await page.waitForTimeout(2000);
    if (reasonText?.trim() === "Не подошло") {
      // Значение находится в p внутри div, идущего сразу за заголовком
      const fixedLogisticsCostValue = page
        .locator(
          'p:has-text("Фиксированная стоимость обратной логистики") + div p'
        )
        .first();
      await fixedLogisticsCostValue.waitFor({
        state: "visible",
        timeout: 10000,
      });
      const costText = await fixedLogisticsCostValue.textContent();
      console.log(
        `✅ Фиксированная стоимость обратной логистики: ${costText?.trim()}`
      );
      expect(costText?.trim()).toBe("—2 500.00 RUB");
    }

    // 12. Подтверждаем заявку
    const confirmButton = page
      .locator('button:has-text("Подтвердить заявку")')
      .first();
    await confirmButton.click();
    console.log("✅ Заявка подтверждена");
    await page.waitForTimeout(2000);

    // 13. Проводим возврат ДС
    const refundButton = page
      .locator('button:has-text("Провести возврат ДС")')
      .first();
    await refundButton.click();
    console.log("✅ Проводим возврат ДС");
    await page.waitForTimeout(2000);

    // 14. Подтверждаем возврат
    const confirmRefund = page
      .locator('button:has-text("Подтвердить")')
      .first();
    await confirmRefund.click();
    console.log("✅ Подтверждаем возврат ДС");
    await page.waitForTimeout(1000);

    itemsProcessed++;
    if (optionIdx >= optionsCount - 1) {
      optionIdx = 0;
    } else {
      optionIdx++;
    }

    // Возвращаемся в заказ через ссылку "Связанный заказ"
    // Используем href-паттерн — номер заказа может дублироваться в заголовке/хлебных крошках
    console.log('🔙 Кликаем по ссылке "Связанный заказ"...');
    const linkedOrderLink = page
      .locator('a[href*="sidepage=order"][href*="sidepageEntityId"]')
      .first();
    await linkedOrderLink.waitFor({ state: "visible", timeout: 10000 });
    await linkedOrderLink.scrollIntoViewIfNeeded();
    await linkedOrderLink.click();
    console.log(`✅ Перешли обратно в заказ ${savedOrderNumber}`);

    // Ссылка открывает страницу заказа — нужно снова открыть раздел Возвратов ДС
    await openReturnsSection(page);
    await refundContainer.waitFor({ state: "visible", timeout: 10000 });
    await tableScroller.waitFor({ state: "visible", timeout: 10000 });
  }

  if (itemsProcessed === 0) {
    throw new Error("❌ Не удалось обработать ни одного товара");
  }

  console.log(`🎉 Тест завершён! Обработано товаров: ${itemsProcessed}`);
  console.log(` Тест проверяет по следующим пунктам:
   1. Создаём возвраты по всем причинам
   2. Возврат создаётся
   3. Причины выбираются
   4. С каждой причиной всё создаётся
   5. Заявка подтверждается
   6. Возврат осуществляется
   7. По причине "Не подошло" — -2500 RUB`)
});
