import { expect, Page } from '@playwright/test';
import { purchaseOrderRows } from './purchaseAwaiting';

export type PurchaseThreadDecision = 'Есть решение' | 'Нет решения' | 'Передан';
export type PurchaseThreadCloseLabel = 'Закрыть' | 'Закрыть тикет';

/**
 * Пока решение не выбрано, «Закрыть» скрыта: закрыть можно только решённый тред.
 * Первый выбор уходит без подтверждения.
 */
export async function setPurchaseThreadDecision(
  page: Page,
  orderNumber: string,
  decision: PurchaseThreadDecision,
  closeLabel: PurchaseThreadCloseLabel,
): Promise<void> {
  const row = purchaseOrderRows(page, orderNumber).first();
  const decisionButton = row.getByRole('button', { name: decision, exact: true });
  await decisionButton.scrollIntoViewIfNeeded();
  await expect(row.getByRole('button', { name: closeLabel, exact: true })).toHaveCount(0);

  const saved = page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' &&
      response.url().includes('/dms/comments/') &&
      response.ok(),
  );
  await decisionButton.click();
  await saved;

  await expect(row.getByRole('button', { name: closeLabel, exact: true })).toBeVisible({
    timeout: 20000,
  });
}

/** Закрытый тред уходит с вкладки: строка с этим товаром больше не находится. */
export async function closePurchaseThread(
  page: Page,
  orderNumber: string,
  closeLabel: PurchaseThreadCloseLabel,
  decision: PurchaseThreadDecision,
): Promise<void> {
  const row = purchaseOrderRows(page, orderNumber).first();
  const closeButton = row.getByRole('button', { name: closeLabel, exact: true });
  await closeButton.scrollIntoViewIfNeeded();
  await expect(row).toContainText(decision);

  const closed = page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' &&
      response.url().includes('/close') &&
      response.ok(),
  );
  await closeButton.click();
  await closed;

  await expect(purchaseOrderRows(page, orderNumber)).toHaveCount(0, { timeout: 20000 });
}
