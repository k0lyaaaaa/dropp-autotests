import { Locator, Page } from '@playwright/test';

/**
 * Поля выбора причины в форме возврата.
 */
export function getRefundReasonSelects(page: Page): Locator {
  const selectTrigger =
    'button[role="combobox"][data-slot="select-trigger"].w-full:not(:disabled)';

  const itemRefundSection = page
    .getByText('Причина возврата ДС', { exact: true })
    .first()
    .locator(
      'xpath=ancestor::*[.//button[@role="combobox" and @data-slot="select-trigger"]][1]'
    );

  return itemRefundSection.locator(selectTrigger);
}

/**
 * Поле причины в форме произвольного возврата.
 */
export function getArbitraryRefundReasonSelect(page: Page): Locator {
  const arbitraryRefundForm = page
    .getByRole('button', { name: 'Провести возврат ДС', exact: true })
    .first()
    .locator(
      'xpath=ancestor::*[.//button[@role="combobox" and @data-slot="select-trigger"]][1]'
    );

  return arbitraryRefundForm
    .locator(
      'button[role="combobox"][data-slot="select-trigger"].w-full:not(:disabled)'
    )
    .first();
}

/**
 * Открытые варианты причин возврата.
 */
export function getRefundReasonOptions(page: Page): Locator {
  return page.getByRole('option');
}

export function getRefundReasonOption(page: Page, reasonText: string): Locator {
  return page.getByRole('option', { name: reasonText, exact: true });
}
