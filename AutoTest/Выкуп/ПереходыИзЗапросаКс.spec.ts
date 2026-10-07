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

const CS_REQUEST: PurchaseThreadTagCase = {
  section: 'Запрос в КС',
  tag: '#cs-request',
  reason: 'Модель',
  tab: 'Запрос КС',
  comment: 'Запрос КС: модель',
};

const FROM_DISCUSSION: PurchaseThreadTagCase[] = [
  {
    section: 'Проверка товара',
    tag: '#pre-order-check',
    reason: 'Цвет',
    tab: 'Preorder check',
    comment: 'Из запроса КС в проверку товара',
  },
  {
    section: 'Невыкуп',
    tag: '#unpurchase',
    reason: 'Overpricing',
    tab: 'Невыкупы',
    comment: 'Из запроса КС в невыкуп',
  },
  {
    section: 'Спецкейс',
    tag: '#special-case',
    reason: 'Alo Yoga',
    tab: 'Спецкейсы',
    comment: 'Из запроса КС в спецкейс',
  },
];

test.describe('Выкуп → из Запрос КС', () => {
  test.setTimeout(420000);

  for (const item of FROM_DISCUSSION) {
    test(`обсуждение отправляет товар в «${item.tab}»`, async ({ page }) => {
      const orderNumber = await putItemOnPurchaseTab(page, CS_REQUEST);
      await sendItemToThreadTag(page, orderNumber, item, OPEN_THREAD_TRIGGER);
      await expectItemInThreadTab(page, orderNumber, item);
    });
  }

  test('колонка «Спецкейс» отправляет товар в «Спецкейсы»', async ({ page }) => {
    const orderNumber = await putItemOnPurchaseTab(page, CS_REQUEST);
    await moveItemByProblemColumn(
      page,
      orderNumber,
      'Спецкейс',
      'Skims',
      'Спецкейс из колонки запроса КС',
      'Спецкейсы'
    );
    await expectItemInThreadTab(page, orderNumber, {
      section: 'Спецкейс',
      tag: '#special-case',
      reason: 'Skims',
      tab: 'Спецкейсы',
      comment: 'Спецкейс из колонки запроса КС',
    });
  });

  test('колонка «Невыкуп» отправляет товар в «Невыкупы»', async ({ page }) => {
    const orderNumber = await putItemOnPurchaseTab(page, CS_REQUEST);
    await moveItemByProblemColumn(
      page,
      orderNumber,
      'Невыкуп',
      'Wrong mapping',
      'Невыкуп из колонки запроса КС',
      'Невыкупы'
    );
    await expectItemInThreadTab(page, orderNumber, {
      section: 'Невыкуп',
      tag: '#unpurchase',
      reason: 'Wrong mapping',
      tab: 'Невыкупы',
      comment: 'Невыкуп из колонки запроса КС',
    });
  });
});
