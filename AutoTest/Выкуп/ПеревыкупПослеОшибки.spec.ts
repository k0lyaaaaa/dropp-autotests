import { test } from '@playwright/test';
import { AuthDMSAdmin } from '../helpers/auth';
import { conductItemInProcessing } from '../helpers/conductPurchaseDeal';
import { openControllingSection, passControlling, searchControllingItems } from '../helpers/controlling';
import { takeOneItem } from '../helpers/purchaseAwaiting';
import { moveRandomItemToRepurchase } from '../helpers/purchaseRepurchase';

test.use({
  headless: true,
});

test.describe('Выкуп → перевыкуп после ошибки контроллинга', () => {
  test.setTimeout(900000);

  test('ошибка в товаре уходит в «Перевыкуп», повторная сделка проходит контроллинг', async ({
    page,
  }) => {
    await AuthDMSAdmin(page);

    const itemId = await moveRandomItemToRepurchase(page);
    await takeOneItem(page, itemId);
    await conductItemInProcessing(page, itemId);

    await openControllingSection(page);
    await searchControllingItems(page, itemId);
    await passControlling(page, itemId);
  });
});
