import { type Page } from '@playwright/test';
import { conductRandomAwaitingItem } from './conductPurchaseDeal';
import {
  markBuyoutErrors,
  openControllingSection,
  searchControllingItems,
  waitForControllingPlacement,
} from './controlling';
import { expectItemOnRepurchaseTab, openRepurchaseTab } from './purchaseAwaiting';

/**
 * Случайный товар из «Ожидают» проводится, в контроллинге получает
 * «Неверный товар» и из-за этого оказывается в «Перевыкуп».
 */
export async function moveRandomItemToRepurchase(page: Page): Promise<string> {
  const itemId = await conductRandomAwaitingItem(page);
  await openControllingSection(page);
  await searchControllingItems(page, itemId);
  await waitForControllingPlacement(page, itemId);
  await markBuyoutErrors(page, itemId, ['Неверный товар']);
  await openRepurchaseTab(page);
  await expectItemOnRepurchaseTab(page, itemId);
  return itemId;
}
