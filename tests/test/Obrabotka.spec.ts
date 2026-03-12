import { test, expect, Page } from '@playwright/test';

test('Копировать item ID заказа на dropp.market', async ({ page }) => {
  test.setTimeout(60000);
  
  // Устанавливаем большой размер окна
  await page.setViewportSize({ width: 1690, height: 1080 });


  
  // Открываем сайт
  await page.goto('https://dev.dropp.market/men');
  console.log('✅ Сайт открыт');
  
  // Кликаем по иконке пользователя
  const userIcon = page.locator('div.HeaderMenu_customer__ymyVN').first();
  await userIcon.waitFor({ state: 'visible', timeout: 10000 });
  await userIcon.click();
  console.log('✅ Кликнули по иконке пользователя');
  
  // Ждём появления формы входа
  await page.waitForSelector('input[type="email"], input[name="email"], input[name="login"]');
  console.log('✅ Форма авторизации загружена');
  
  // Вводим логин
  const loginField = page.locator('input[name="login"]');
  await loginField.waitFor({ state: 'visible', timeout: 10000 });
  await loginField.fill('n.tolmachev+test2@dropp.market');
  console.log('✅ Логин введён');
  
  // Вводим пароль
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill('Kbpeymrf123');
  console.log('✅ Пароль введён');
  
  // Нажимаем кнопку входа
  const submitButton = page.locator('[data-test-id="popup-sign-in-button"]');
  await submitButton.click();
  console.log('✅ Нажали кнопку входа');
  
  // Ждём успешной авторизации
  await page.waitForTimeout(3000);
  
  // Открываем меню пользователя
  const userMenu = page.locator('div.HeaderMenu_customer__ymyVN').first();
  await userMenu.waitFor({ state: 'visible', timeout: 10000 });
  await userMenu.click();
  console.log('✅ Кликнули по иконке пользователя');

  // Переходим в "Мои заказы"
  const myOrdersLink = page.locator('[data-test-id="customer-dialog-link-button-1"]').first();
  await myOrdersLink.waitFor({ state: 'visible', timeout: 10000 });
  await myOrdersLink.click();
  console.log('✅ Перешли в мои заказы');
  
  // Ждём загрузки заказов
  await page.waitForSelector('text=/ARBC-\\d{6}/', { timeout: 10000 });
  
  // Получаем номер первого заказа
  const firstOrderElement = page.locator('text=/ARBC-\\d{6}/').first();
  const firstOrderText = await firstOrderElement.textContent();
  
  // Используем гибкое регулярное выражение для любых 4 букв
  const savedOrderNumber = firstOrderText?.match(/[A-Z]{4}-\d{6}/)?.[0] || '';
  
  if (savedOrderNumber) {
    console.log(`📦 Номер заказа сохранён: ${savedOrderNumber}`);
  } else {
    console.log('❌ Не удалось получить номер заказа');
  }

  // Переходим в админку
  await page.goto('https://dev-dms.dropp.market/orders');
  console.log('✅ Сайт админки открыт');

  // Авторизация в админке
  const adminLogin = page.locator('input[name="email"]');
  await adminLogin.waitFor({ state: 'visible', timeout: 10000 });
  await adminLogin.fill('dms@dropp.market');
  console.log('✅ Логин админа введён');

  const adminPassword = page.locator('input[type="password"]').first();
  await adminPassword.fill('7H24`tLl7P{x}');
  console.log('✅ Пароль админа введён');

  const adminLoginButton = page.locator('button[type="submit"]');
  await adminLoginButton.click();
  console.log('✅ Нажали кнопку входа в админку');
  
  // Ждём загрузки страницы с заказами
  await page.waitForTimeout(3000);
  
  // Ищем заказ по сохранённому номеру
  const orderLink = page.locator(`a:has-text("${savedOrderNumber}")`).first();
  await orderLink.waitFor({ state: 'visible', timeout: 10000 });
  await orderLink.click();
  console.log(`✅ Открыт заказ ${savedOrderNumber}`);

  // Ждём загрузки страницы заказа
  await page.waitForTimeout(2000);
  
  // ===== ФУНКЦИЯ ДЛЯ ВЫБОРА ОПЦИИ В СЕЛЕКТЕ =====
  async function selectOption(page: Page, selectIndex: number, optionText: string, description: string) {
    console.log(`   🔍 Выбираем ${description}...`);
    
    // Получаем свежий список селектов
    const currentSelects = page.locator('.MuiSelect-select.css-ljcffu');
    const currentCount = await currentSelects.count();
    console.log(`📊 Доступно селектов: ${currentCount}`);
    
    if (currentCount <= selectIndex) {
      throw new Error(`❌ Селект с индексом ${selectIndex} не найден`);
    }
    
    const select = currentSelects.nth(selectIndex);
    await select.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await select.click();
    console.log(`✅ Открыли селект #${selectIndex + 1}`);
    
    await page.waitForSelector('li[role="option"]', { timeout: 5000 });
    
    const option = page.locator(`li[role="option"]:has-text("${optionText}")`).first();
    const optionExists = await option.count();
    
    if (optionExists === 0) {
      console.log(`❌ Опция "${optionText}" не найдена`);
      
      // Диагностика
      const options = page.locator('li[role="option"]');
      const optionsCount = await options.count();
      console.log(`📊 Доступные опции:`);
      for (let i = 0; i < Math.min(optionsCount, 5); i++) {
        const text = await options.nth(i).textContent();
        console.log(`   ${i}: "${text}"`);
      }
      return false;
    }
    
    await option.click();
    console.log(`✅ Выбрано: ${description} - ${optionText}`);
    await page.waitForTimeout(500);
    return true;
  }

  // ===== ЗАПОЛНЯЕМ ФОРМУ - ТОВАР 01 =====
  console.log('\n========== ТОВАР 01 ==========');
  
  const fullItemId01 = `${savedOrderNumber}-01`;
  console.log(`🔍 Ищем товар: ${fullItemId01}`);
  
  const itemElement01 = page.locator(`.MuiDataGrid-cell:has-text("${fullItemId01}") .css-1gtanqs`).first();
  await itemElement01.waitFor({ state: 'visible', timeout: 10000 });
  const itemText01 = await itemElement01.textContent();
  console.log(`🔍 Найден элемент с текстом: ${itemText01?.trim()}`);
  
  await itemElement01.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await itemElement01.click();
  console.log(`✅ Кликнули по товару ${fullItemId01}`);

  // Вводим цену мерчанта
  const amountEl01 = page.locator('input[name="amount"]').first();
  await amountEl01.waitFor({ state: 'visible', timeout: 10000 });
  await amountEl01.fill('4213');
  console.log('✅ Цена мерчанта введена');
  
  // Выбираем валюту (индекс 1)
  await selectOption(page, 1, 'USD', 'валюта');
  
  // Вводим доставку мерчанта
  const merchantShipmentAmountEL01 = page.locator('input[name="merchantShipmentAmount"]').first();
  await merchantShipmentAmountEL01.waitFor({ state: 'visible', timeout: 10000 });
  await merchantShipmentAmountEL01.fill('41');
  console.log('✅ Доставка мерчанта введена');

  // Выбираем схему перевозки (индекс 2)
  await selectOption(page, 2, 'Globbing - United Kingdom', 'схема перевозки');

  // Выбираем мерчанта (индекс 3)
  await selectOption(page, 3, 'StockX', 'мерчант');

  // Выбираем страну (индекс 4 или 3, зависит от количества)
  const allSelectsCount = await page.locator('.MuiSelect-select.css-ljcffu').count();
  const countryIndex = allSelectsCount === 5 ? 4 : 3;
  await selectOption(page, countryIndex, 'ОАЭ', 'страна');

  // Вводим ссылку
  const productLinkEl01 = page.locator('input[name="productLink"]').first();
  await productLinkEl01.waitFor({ state: 'visible', timeout: 10000 });
  await productLinkEl01.fill('43куцв');
  console.log('✅ Ссылка введена');

  console.log('\n💾 Сохраняем изменения...');
  
  const saveButton = page.locator('button:has-text("Сохранить")').first();
  await saveButton.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  
  const isEnabled = await saveButton.isEnabled();
  console.log(`📌 Кнопка доступна: ${isEnabled}`);

console.log('\n========== ТОВАР 02 ==========');

const fullItemId02 = `${savedOrderNumber}-02`;
console.log(`🔍 Ищем товар: ${fullItemId02}`);

const itemElement02 = page.locator(`.MuiDataGrid-cell:has-text("${fullItemId02}") .css-1gtanqs`).first();
await itemElement02.waitFor({ state: 'visible', timeout: 10000 });
const itemText02 = await itemElement02.textContent();
console.log(`🔍 Найден элемент с текстом: ${itemText02?.trim()}`);

await itemElement02.scrollIntoViewIfNeeded();
await page.waitForTimeout(500);
await itemElement02.click();
console.log(`✅ Кликнули по товару ${fullItemId02}`);

await itemElement02.click();
console.log(`✅ Кликнули по товару ${fullItemId02}`);

// Принудительно фокусим поле, чтобы оно стало активным
await page.locator('input[name="amount"]').nth(1).evaluate(el => {
  el.focus();
  el.click(); // иногда нужно
});

// Теперь ждём, что оно реально появилось
const amountEl02 = page.locator('input[name="amount"]').nth(1);
await amountEl02.waitFor({ state: 'visible', timeout: 10000 });
await amountEl02.fill('8500');

// Выбираем валюту (индекс 1)
await selectOption(page, 1, 'EUR', 'валюта');

// Вводим доставку мерчанта
const merchantShipmentAmountEL02 = page.locator('input[name="merchantShipmentAmount"]').nth(1);
await merchantShipmentAmountEL02.waitFor({ state: 'visible', timeout: 10000 });
await merchantShipmentAmountEL02.fill('55');
console.log('✅ Доставка мерчанта введена');

// Выбираем схему перевозки (индекс 2)
await selectOption(page, 2, 'Globbing - United Kingdom', 'схема перевозки');

// Выбираем мерчанта (индекс 3)
await selectOption(page, 3, 'FARFETCH', 'мерчант');

// Выбираем страну (индекс 4 или 3, зависит от количества)
const allSelectsCount1= await page.locator('.MuiSelect-select.css-ljcffu').count();
const countryIndex1 = allSelectsCount1 === 5 ? 4 : 3;
await selectOption(page, countryIndex1, 'ОАЭ', 'страна');

// Вводим ссылку
const productLinkEl02 = page.locator('input[name="productLink"]').nth(1);
await productLinkEl02.waitFor({ state: 'visible', timeout: 10000 });
await productLinkEl02.fill('55куцв');
console.log('✅ Ссылка введена');
  // ===== СОХРАНЯЕМ =====
  console.log('\n💾 Сохраняем изменения...');
  
  const saveButton1 = page.locator('button:has-text("Сохранить")').first();
  await saveButton1.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  
  const isEnabled1 = await saveButton1.isEnabled();
  console.log(`📌 Кнопка доступна: ${isEnabled}1`);
  
  if (isEnabled) {
    await saveButton.click();
    console.log('✅ Нажали кнопку "Сохранить"');
    
    // Ждём подтверждения
    await page.waitForTimeout(2000);
    
    // Проверяем успех
    const successMessage = page.locator('text="Успешно", text="Сохранено", [class*="success"]').first();
    if (await successMessage.isVisible().catch(() => false)) {
      console.log('✅ Данные успешно сохранены');
    }
  } else {
    console.log('❌ Кнопка неактивна');
  }

  console.log('\n🎉 Тест завершён!');
});