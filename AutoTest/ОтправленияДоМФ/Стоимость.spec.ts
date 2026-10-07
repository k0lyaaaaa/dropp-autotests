import { test } from '@playwright/test';
import { AuthDMSAdmin } from '../helpers/auth';
import { fillParcelCost, preparePendingEntryShipment, visibleBrowser } from '../helpers/merchantToMf';

test.use(visibleBrowser);

test.describe('Отправления до МФ → стоимость отправления', () => {
  test.setTimeout(900000);

  test('сумма и USD сохраняются в строке на вводе в систему', async ({ page }) => {
    await AuthDMSAdmin(page);

    const { itemId } = await preparePendingEntryShipment(page);
    await fillParcelCost(page, itemId, '15');
  });
});
