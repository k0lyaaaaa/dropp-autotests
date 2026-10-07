import { expect, Locator, Page } from '@playwright/test';
import { purchaseOrderRows } from './purchaseAwaiting';

async function columnCell(page: Page, row: Locator, header: string): Promise<Locator> {
  const headers = page.getByRole('columnheader');
  const count = await headers.count();

  for (let index = 0; index < count; index += 1) {
    const name = (await headers.nth(index).innerText()).replace(/\s+/g, ' ').trim();
    if (name === header || name.startsWith(`${header} `)) {
      return row.getByRole('cell').nth(index);
    }
  }

  throw new Error(`Колонка «${header}» не найдена`);
}

/**
 * Колонки «Спецкейс» и «Невыкуп»: причина в выпадающем списке, затем
 * обязательный «Текст запроса». На своей вкладке колонка только для чтения,
 * правится зеркальная. Без текста кнопка «Сохранить» в диалоге выключена.
 */
export async function moveItemByProblemColumn(
  page: Page,
  orderNumber: string,
  column: 'Спецкейс' | 'Невыкуп',
  reason: string,
  comment: string,
  tab: string
): Promise<void> {
  const row = purchaseOrderRows(page, orderNumber).first();
  const cell = await columnCell(page, row, column);
  await cell.scrollIntoViewIfNeeded();
  await cell.getByRole('button', { name: 'Не выбрано' }).click();
  const menu = page.locator('[data-slot="dropdown-menu-content"]');
  await expect(menu).toBeVisible();
  await menu.getByRole('menuitemcheckbox', { name: reason, exact: true }).click();
  await page.keyboard.press('Escape');
  await cell.getByRole('button', { name: 'Сохранить' }).click();

  const dialog = page.getByRole('dialog');
  await dialog.getByPlaceholder('Текст запроса').fill(comment);
  await dialog.getByRole('button', { name: 'Сохранить', exact: true }).click();

  await expect(page.locator('.Toastify__toast--success').filter({ hasText: tab }).last()).toBeVisible({
    timeout: 20000,
  });
}
