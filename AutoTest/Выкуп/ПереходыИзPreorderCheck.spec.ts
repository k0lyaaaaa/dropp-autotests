import { test, type Page } from '@playwright/test';
import { AuthDMSAdmin } from '../helpers/auth';
import { moveItemByProblemColumn } from '../helpers/purchaseFromPreorder';
import { openAwaitingPurchaseTab, readRandomAwaitingItemId } from '../helpers/purchaseAwaiting';
import {
  expectItemInThreadTab,
  sendItemToThreadTag,
  type PurchaseThreadTagCase,
} from '../helpers/purchaseThreadTags';

test.use({
  headless: true,
});

test.describe.configure({ mode: 'serial' });

const PREORDER: PurchaseThreadTagCase = {
  section: 'Проверка товара',
  tag: '#pre-order-check',
  reason: 'Размер',
  tab: 'Preorder check',
  comment: 'Проверка товара: размер',
};

const FROM_DISCUSSION: PurchaseThreadTagCase[] = [
  {
    section: 'Запрос в КС',
    tag: '#cs-request',
    reason: 'Модель',
    tab: 'Запрос КС',
    comment: 'Из Preorder check в запрос КС',
  },
  {
    section: 'Невыкуп',
    tag: '#unpurchase',
    reason: 'Overpricing',
    tab: 'Невыкупы',
    comment: 'Из Preorder check в невыкуп',
  },
  {
    section: 'Спецкейс',
    tag: '#special-case',
    reason: 'Alo Yoga',
    tab: 'Спецкейсы',
    comment: 'Из Preorder check в спецкейс',
  },
];

async function putItemOnPreorderCheck(page: Page): Promise<string> {
  await AuthDMSAdmin(page);
  await openAwaitingPurchaseTab(page);
  const itemId = await readRandomAwaitingItemId(page);
  await sendItemToThreadTag(page, itemId, PREORDER);
  await expectItemInThreadTab(page, itemId, PREORDER);
  return itemId;
}

test.describe('Выкуп → из Preorder check', () => {
  test.setTimeout(420000);

  for (const item of FROM_DISCUSSION) {
    test(`обсуждение отправляет товар в «${item.tab}»`, async ({ page }) => {
      const orderNumber = await putItemOnPreorderCheck(page);
      await sendItemToThreadTag(
        page,
        orderNumber,
        item,
        /Есть открытые запросы|Есть комментарии|Начать обсуждение/
      );
      await expectItemInThreadTab(page, orderNumber, item);
    });
  }

  test('колонка «Спецкейс» отправляет товар в «Спецкейсы»', async ({ page }) => {
    const orderNumber = await putItemOnPreorderCheck(page);
    await moveItemByProblemColumn(
      page,
      orderNumber,
      'Спецкейс',
      'Skims',
      'Спецкейс из колонки',
      'Спецкейсы'
    );
    await expectItemInThreadTab(page, orderNumber, {
      section: 'Спецкейс',
      tag: '#special-case',
      reason: 'Skims',
      tab: 'Спецкейсы',
      comment: 'Спецкейс из колонки',
    });
  });

  test('колонка «Невыкуп» отправляет товар в «Невыкупы»', async ({ page }) => {
    const orderNumber = await putItemOnPreorderCheck(page);
    await moveItemByProblemColumn(
      page,
      orderNumber,
      'Невыкуп',
      'Wrong mapping',
      'Невыкуп из колонки',
      'Невыкупы'
    );
    await expectItemInThreadTab(page, orderNumber, {
      section: 'Невыкуп',
      tag: '#unpurchase',
      reason: 'Wrong mapping',
      tab: 'Невыкупы',
      comment: 'Невыкуп из колонки',
    });
  });
});
