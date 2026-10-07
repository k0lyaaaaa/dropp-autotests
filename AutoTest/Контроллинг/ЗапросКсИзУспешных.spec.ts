import { test } from '@playwright/test';
import { AuthDMSAdmin } from '../helpers/auth';
import { conductRandomAwaitingItem } from '../helpers/conductPurchaseDeal';
import {
  openControllingSection,
  passControlling,
  requestControllingCs,
  searchControllingItems,
} from '../helpers/controlling';

test.use({
  headless: true,
});

test.describe('Контроллинг → запрос в КС из «Успешные»', () => {
  test.setTimeout(720000);

  test('из «Успешные» отправляется запрос в КС', async ({ page }) => {
    await AuthDMSAdmin(page);

    const itemId = await conductRandomAwaitingItem(page);
    await openControllingSection(page);
    await searchControllingItems(page, itemId);
    // Автоконтроллинг может положить товар сразу в «Успешные»
    // или оставить на ручной проверке — «Успешно» доводит его туда.
    await passControlling(page, itemId);
    await requestControllingCs(page, itemId, 'Успешные', 'Автотест: запрос в КС из успешных');
  });
});
