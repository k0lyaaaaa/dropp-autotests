import { test } from '@playwright/test';
import { moveItemByProblemColumn } from '../helpers/purchaseFromPreorder';
import {
  expectItemInThreadTab,
  OPEN_THREAD_TRIGGER,
  putItemOnPurchaseTab,
  sendItemToThreadTag,
  type PurchaseThreadTagCase,
} from '../helpers/purchaseThreadTags';

test.use({
  headless: true,
});

test.describe.configure({ mode: 'serial' });

const UNPURCHASED: PurchaseThreadTagCase = {
  section: 'Невыкуп',
  tag: '#unpurchase',
  reason: 'Out of stock',
  tab: 'Невыкупы',
  comment: 'Невыкуп: нет в наличии',
};

const FROM_DISCUSSION: PurchaseThreadTagCase[] = [
  {
    section: 'Запрос в КС',
    tag: '#cs-request',
    reason: 'Модель',
    tab: 'Запрос КС',
    comment: 'Из невыкупа в запрос КС',
  },
  {
    section: 'Проверка товара',
    tag: '#pre-order-check',
    reason: 'Размер',
    tab: 'Preorder check',
    comment: 'Из невыкупа в проверку товара',
  },
  {
    section: 'Спецкейс',
    tag: '#special-case',
    reason: 'PayPal',
    tab: 'Спецкейсы',
    comment: 'Из невыкупа в спецкейс',
  },
];

test.describe('Выкуп → из Невыкупа', () => {
  test.setTimeout(420000);

  for (const item of FROM_DISCUSSION) {
    test(`обсуждение отправляет товар в «${item.tab}»`, async ({ page }) => {
      const orderNumber = await putItemOnPurchaseTab(page, UNPURCHASED);
      await sendItemToThreadTag(page, orderNumber, item, OPEN_THREAD_TRIGGER);
      await expectItemInThreadTab(page, orderNumber, item);
    });
  }

  test('колонка «Спецкейс» отправляет товар в «Спецкейсы»', async ({ page }) => {
    const orderNumber = await putItemOnPurchaseTab(page, UNPURCHASED);
    await moveItemByProblemColumn(
      page,
      orderNumber,
      'Спецкейс',
      'Skims',
      'Спецкейс из колонки невыкупа',
      'Спецкейсы'
    );
    await expectItemInThreadTab(page, orderNumber, {
      section: 'Спецкейс',
      tag: '#special-case',
      reason: 'Skims',
      tab: 'Спецкейсы',
      comment: 'Спецкейс из колонки невыкупа',
    });
  });
});
