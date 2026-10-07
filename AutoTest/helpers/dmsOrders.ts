import { Locator, Page } from '@playwright/test';

/**
 * Поле поиска заказа в DMS.
 */
export function getDmsOrderSearchInput(page: Page): Locator {
  return page.getByPlaceholder('Поиск по номеру заказа');
}

/**
 * Открывает заказ в DMS через иконку external-link рядом с его номером.
 */
export async function openDmsOrder(page: Page, orderNumber: string): Promise<void> {
  const externalLinkIcon = page
    .getByRole('link', { name: orderNumber, exact: true })
    .first();

  await externalLinkIcon.waitFor({ state: 'visible', timeout: 15000 });
  await externalLinkIcon.click();
}

/**
 * Повторно открывает заказ через блок «Ранее открытые».
 */
export async function openRecentlyOpenedDmsOrder(
  page: Page,
  orderNumber: string
): Promise<void> {
  const recentOrderButton = page.getByRole('button', {
    name: `Заказ ${orderNumber}`,
    exact: true,
  });

  await recentOrderButton.waitFor({ state: 'visible', timeout: 15000 });
  await recentOrderButton.click();
}
