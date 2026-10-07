import { Locator, Page } from '@playwright/test';

const REFUND_AMOUNT_EXCEEDS_ORDER_MESSAGE =
  'Refund amount cannot be greater than order amount';
const REFUND_AMOUNT_INVALID_MESSAGE = 'Введите корректное число';
const FIXED_RETURN_LOGISTICS_LABEL =
  'Фиксированная стоимость обратной логистики';

export function getRefundAmountExceedsOrderError(page: Page): Locator {
  return page
    .locator('p.text-destructive')
    .filter({ hasText: REFUND_AMOUNT_EXCEEDS_ORDER_MESSAGE })
    .first();
}

export function getRefundAmountInvalidError(page: Page): Locator {
  return page
    .locator('p.text-destructive')
    .filter({ hasText: REFUND_AMOUNT_INVALID_MESSAGE })
    .first();
}

export function getFixedReturnLogisticsLabel(page: Page): Locator {
  return page.getByText(FIXED_RETURN_LOGISTICS_LABEL, { exact: true }).first();
}

export function getFixedReturnLogisticsCost(page: Page): Locator {
  return getFixedReturnLogisticsLabel(page)
    .locator('xpath=following-sibling::span[1]');
}
