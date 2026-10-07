import { Locator, Page } from '@playwright/test';

/**
 * Таблица товаров в разделе «Вернуть ДС потоварно».
 */
export function getRefundItemsTable(page: Page): Locator {
  return page
    .getByRole('heading', { name: 'Вернуть ДС потоварно', exact: true })
    .locator('xpath=following::table[1]');
}

/**
 * Чекбоксы товаров без чекбокса в заголовке таблицы.
 */
export function getRefundItemCheckboxes(table: Locator): Locator {
  return table.getByRole('checkbox', { name: /^Выбрать товар / });
}

/**
 * Кнопки удаления выбранных товаров из заявки на возврат.
 */
export function getRemoveFromRefundButtons(page: Page): Locator {
  return page.getByRole('button', {
    name: 'Убрать из возврата',
    exact: true,
  });
}

export async function isRefundItemChecked(checkbox: Locator): Promise<boolean> {
  return (await checkbox.getAttribute('aria-checked')) === 'true';
}
