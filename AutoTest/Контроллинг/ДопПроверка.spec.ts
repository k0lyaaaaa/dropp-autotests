import { test } from '@playwright/test';
import { AuthDMSAdmin } from '../helpers/auth';
import { conductRandomAwaitingItem } from '../helpers/conductPurchaseDeal';
import {
  openControllingSection,
  requestAdditionalCheck,
  requestControllingCs,
  searchControllingItems,
  waitForControllingPlacement,
} from '../helpers/controlling';

test.use({
  headless: true,
});

/** Одна из двух категорий колонки «Доп. проверка». Вторая — «Проверить размер». */
const ADDITIONAL_CHECK_REASON = 'Проверить товар';

test.describe('Контроллинг → доп. проверка и запрос в КС', () => {
  test.setTimeout(1800000);

  test('из «Ручная проверка» одна причина, затем запрос в КС', async ({ page }) => {
    await AuthDMSAdmin(page);

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const itemId = await conductRandomAwaitingItem(page);
      await openControllingSection(page);
      await searchControllingItems(page, itemId);
      const placement = await waitForControllingPlacement(page, itemId);
      // Успешный автоконтроллинг кладёт товар сразу в «Успешные».
      // Доп. проверку оттуда запросить нельзя — нужна следующая сделка.
      if (placement !== 'manual') continue;

      const manualTab = page.getByRole('tab', { name: 'Ручная проверка', exact: true });
      if ((await manualTab.getAttribute('data-state')) !== 'active') continue;

      await test.step(`доп. проверка: ${ADDITIONAL_CHECK_REASON}`, async () => {
        await requestAdditionalCheck(page, itemId, [ADDITIONAL_CHECK_REASON]);
      });
      await test.step('запрос в КС', async () => {
        await requestControllingCs(page, itemId, 'Доп. проверка');
      });
      return;
    }

    throw new Error('Ни одна сделка не попала в «Ручная проверка»');
  });
});
