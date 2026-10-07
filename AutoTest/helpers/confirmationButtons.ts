import { Locator, Page } from '@playwright/test';

/**
 * Обычная кнопка подтверждения действия.
 */
export function getConfirmButton(page: Page): Locator {
  return page
    .getByRole('button', { name: 'Подтвердить', exact: true })
    .and(page.locator('button[data-slot="button"]'))
    .last();
}

/**
 * Подтверждение удаления или отклонения заявки.
 */
export function getDestructiveConfirmButton(page: Page): Locator {
  return getConfirmButton(page)
    .and(page.locator('button[data-variant="destructive"]'));
}
