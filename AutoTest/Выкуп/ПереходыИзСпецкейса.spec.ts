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

const SPECIAL_CASE: PurchaseThreadTagCase = {
  section: 'Спецкейс',
  tag: '#special-case',
  reason: 'Alo Yoga',
  tab: 'Спецкейсы',
  comment: 'Спецкейс: Alo Yoga',
};

const FROM_DISCUSSION: PurchaseThreadTagCase[] = [
  {
    section: 'Запрос в КС',
    tag: '#cs-request',
    reason: 'Цвет',
    tab: 'Запрос КС',
    comment: 'Из спецкейса в запрос КС',
  },
  {
    section: 'Проверка товара',
    tag: '#pre-order-check',
    reason: 'Размер',
    tab: 'Preorder check',
    comment: 'Из спецкейса в проверку товара',
  },
  {
    section: 'Невыкуп',
    tag: '#unpurchase',
    reason: 'Overpricing',
    tab: 'Невыкупы',
    comment: 'Из спецкейса в невыкуп',
  },
];

test.describe('Выкуп → из Спецкейса', () => {
  test.setTimeout(420000);

  for (const item of FROM_DISCUSSION) {
    test(`обсуждение отправляет товар в «${item.tab}»`, async ({ page }) => {
      const orderNumber = await putItemOnPurchaseTab(page, SPECIAL_CASE);
      await sendItemToThreadTag(page, orderNumber, item, OPEN_THREAD_TRIGGER);
      await expectItemInThreadTab(page, orderNumber, item);
    });
  }

  test('колонка «Невыкуп» отправляет товар в «Невыкупы»', async ({ page }) => {
    const orderNumber = await putItemOnPurchaseTab(page, SPECIAL_CASE);
    await moveItemByProblemColumn(
      page,
      orderNumber,
      'Невыкуп',
      'Wrong mapping',
      'Невыкуп из колонки спецкейса',
      'Невыкупы'
    );
    await expectItemInThreadTab(page, orderNumber, {
      section: 'Невыкуп',
      tag: '#unpurchase',
      reason: 'Wrong mapping',
      tab: 'Невыкупы',
      comment: 'Невыкуп из колонки спецкейса',
    });
  });
});
