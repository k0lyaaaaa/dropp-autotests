import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
import { AuthDMSFin } from './AuthDMSFin';
import { loginAsUser } from './auth';
import { SaveLastOrder, savedOrderNumber} from './saveLastOrder';
import { createBackItem } from './CreateOneItemBack';
dotenv.config();

test('Создание возврата по последнему купленному заказу', async ({ page, request }) => {
  test.setTimeout(120000); // Увеличил таймаут для операций с возвратами
   
  // // 1. Создать 1 заказ через API
  // const orderNumber = await createBackItem(request);
  // console.log(`✅ Создан заказ: ${orderNumber}`);
  
  // 2. Авторизация в UI
  await loginAsUser(page);

  // 3. Получаем номер последнего заказа (из UI)
  await SaveLastOrder(page);
  console.log(`📦 Номер заказа из UI: ${savedOrderNumber}`);

  // 4. Авторизация в админке
  await AuthDMSFin(page);

  await page.waitForTimeout(3000);
  
  // 5. Нажимаем и вводим значение в поиск
  const searchInput = page.locator('input[placeholder="Поиск"]');
  await searchInput.waitFor({ state: 'visible', timeout: 10000 });
  await searchInput.fill(savedOrderNumber);
  console.log('✅ Поиск: значение введено');

  // 6. Нажимаем кнопку поиска
  const searchButton = page.locator('[data-testid="SearchIcon"]');
  await searchButton.waitFor({ state: 'visible', timeout: 10000 });
  await searchButton.click();
  console.log('✅ Поиск выполнен');

  // 7. Открываем заказ
  await page.locator(`a:has-text("${savedOrderNumber}")`).first().click();
  console.log(`✅ Открыт заказ ${savedOrderNumber}`);

  // 8. Открываем раздел Возвратов ДС
  const returnsSection = page.locator('button:has-text("Открыть раздел Возвратов ДС")').first();
  await returnsSection.click();
  console.log('✅ Открыт раздел Возвратов ДС');

  // 9. Проверяем, открыт ли раздел возвратов
  const refundContainer = page.locator('div[legend="Вернуть ДС потоварно"]').first();
  const isRefundSectionVisible = await refundContainer.isVisible().catch(() => false);

  if (!isRefundSectionVisible) {
    console.log('🔍 Раздел возвратов закрыт, открываем...');
    await returnsSection.click();
    await refundContainer.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ Контейнер возвратов загружен');
  } else {
    console.log('✅ Раздел возвратов уже открыт');
  }

// 8. Ищем ПЕРВЫЙ АКТИВНЫЙ чекбокс (простой перебор)
console.log('🔍 Ищем активный чекбокс...');

let selectedCount = 0;
let selectedIndex = -1;

// Получаем все чекбоксы
const allCheckboxes = refundContainer.locator('input[name="select_row"]');
const totalCheckboxes = await allCheckboxes.count();
console.log(`📊 Всего чекбоксов: ${totalCheckboxes}`);

// Проходим по каждому чекбоксу по порядку
for (let i = 0; i < totalCheckboxes; i++) {
  const checkbox = allCheckboxes.nth(i);
  
  // Скроллим к этому чекбоксу (он станет видимым)
  await checkbox.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500); // ждём после скролла
  
  const isDisabled = await checkbox.isDisabled();
  console.log(`🔍 Чекбокс #${i + 1}: disabled = ${isDisabled}`);
  
  if (!isDisabled) {
    try {
      await checkbox.check({ force: true });
      selectedCount++;
      selectedIndex = i + 1;
      console.log(`✅ Выбран активный чекбокс #${selectedIndex}`);
      break;
    } catch (error) {
      console.log(`⚠️ Не удалось выбрать чекбокс #${i + 1}, пробуем следующий...`);
    }
  }
}

if (selectedCount === 0) {
  console.log('❌ Активный чекбокс не найден');
  throw new Error('❌ Не удалось выбрать ни один активный чекбокс');
}

console.log(`\n📊 ИТОГ: Выбран чекбокс #${selectedIndex}`);
  // 12. Нажимаем кнопку возврата
  if (selectedCount > 0) {
    const returnButton = page.locator('button:has-text("Заполнить заявку на возврат ДС")').first();
    await returnButton.waitFor({ state: 'visible', timeout: 5000 });
    
    const isEnabled = await returnButton.isEnabled();
    console.log(`📌 Кнопка активна: ${isEnabled}`);
    
    if (isEnabled) {
      await returnButton.click();
      console.log('✅ Нажали кнопку "Заполнить заявку на возврат ДС"');
    } else {
      console.log('❌ Кнопка неактивна');
    }
  } else {
    console.log('❌ Нет выбранных чекбоксов — кнопка не нажимается');
  }
// Находим селект (обычно он один в разделе возврата)
const reasonSelect = page.locator('.MuiSelect-select.css-ljcffu').first();

// Открываем селект
await reasonSelect.click();
console.log('✅ Открыт список причин возврата');

// Ждём появления опций
await page.waitForSelector('li[role="option"]', { timeout: 5000 });

// Доступные опции (подбери под свой UI)
const reasonOptions = [
  'Отсутствует в наличии',
];

// Выбираем первую доступную опцию
const firstOption = page.locator('li[role="option"]').first();
const reasonText = await firstOption.textContent();
await firstOption.click();
console.log(`✅ Выбрана причина: ${reasonText?.trim()}`);

// Нажимаем отправить на кнопку "Отправить заявку менеджеру"
  const clickMeneger = page.locator('button:has-text("Отправить заявку менеджеру")').first();
  await clickMeneger.click();
  console.log('✅ Отправляем заявку менеджеру');

  // Нажимаем отправить на кнопку "Подтвердить заявку"
  const clickCompleteMeneger = page.locator('button:has-text("Подтвердить заявку")').first();
  await clickCompleteMeneger.click();
  console.log('✅ Подтверждаем заявку');

    // Нажимаем отправить на кнопку "Отправить заявку менеджеру"
  const makeRefund = page.locator('button:has-text("Провести возврат ДС")').first();
  await makeRefund.click();
  console.log('✅ Проводим возврат ДС');

      // Нажимаем отправить на кнопку "Отправить заявку менеджеру"
  const confirmRefund = page.locator('button:has-text("Подтвердить")').first();
  await confirmRefund.click();
  console.log('✅ Подтверждаем возврат ДС ');

  await page.waitForTimeout(3000);
});