import { expect, test } from '@playwright/test';
import { purchaseOrderRows } from '../helpers/purchaseAwaiting';
import { expectItemOnPurchaseTab } from '../helpers/purchaseCancellation';
import {
  decideSupervising,
  expectSupervisingIcon,
  putOverLimitItemOnSupervising,
} from '../helpers/purchaseSupervising';

test.use({
  headless: true,
});

test.describe.configure({ mode: 'serial' });

test.describe('Выкуп → На согласовании', () => {
  test.setTimeout(420000);

  test('«Одобрить» ставит иконку «Согласование одобрено»', async ({ page }) => {
    const orderNumber = await putOverLimitItemOnSupervising(page);
    await decideSupervising(page, orderNumber, 'Одобрить');
    await expectSupervisingIcon(page, orderNumber, 'Согласование одобрено');
  });

  test('«Отклонить» ставит иконку «Согласование отклонено»', async ({ page }) => {
    const orderNumber = await putOverLimitItemOnSupervising(page);
    await decideSupervising(page, orderNumber, 'Отклонить');
    await expectSupervisingIcon(page, orderNumber, 'Согласование отклонено');
  });

  test('«Отозвать» возвращает товар в «В обработке» без иконки согласования', async ({ page }) => {
    const orderNumber = await putOverLimitItemOnSupervising(page);
    await decideSupervising(page, orderNumber, 'Отозвать');
    await expectItemOnPurchaseTab(page, orderNumber, 'В обработке');
    await expect(purchaseOrderRows(page, orderNumber).getByLabel(/Согласование/)).toHaveCount(0);
  });
});
