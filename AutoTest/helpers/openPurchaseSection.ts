import { Locator, Page } from '@playwright/test';

export function getPurchaseSection(page: Page): Locator {
  return page.getByRole('link', { name: 'Выкуп', exact: true });
}

export async function openPurchaseSection(page: Page): Promise<void> {
  const purchaseSection = getPurchaseSection(page);
  await purchaseSection.waitFor({ state: 'visible', timeout: 20000 });
  await purchaseSection.click();
  await page.waitForURL(/\/buyout/);
}