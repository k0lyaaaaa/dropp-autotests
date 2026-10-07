import { test } from '@playwright/test';
import { AuthDMSAdmin } from '../helpers/auth';
import { conductRandomAwaitingItem } from '../helpers/conductPurchaseDeal';
import {
  openControllingSection,
  passControlling,
  passControllingManually,
  searchControllingItems,
} from '../helpers/controlling';

test.use({
  headless: true,
});

test.describe('Контроллинг → успешная проверка', () => {
  test.setTimeout(720000);

  test('после сделки товар оказывается в «Успешные»', async ({ page }) => {
    async function conductDeal(): Promise<string> {
      return conductRandomAwaitingItem(page);
    }

    await AuthDMSAdmin(page);
    const firstOrder = await conductDeal();
    await openControllingSection(page);
    await searchControllingItems(page, firstOrder);
    const outcome = await passControlling(page, firstOrder);

    if (outcome !== 'auto') return;

    const secondOrder = await conductDeal();
    await openControllingSection(page);
    await searchControllingItems(page, secondOrder);
    await passControllingManually(page, secondOrder);
  });
});
