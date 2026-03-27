// auth.ts
import { Page } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config();

export async function loginAsUser(page: Page) {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('https://dev.dropp.market/men');
  console.log('✅ Сайт открыт (авторизация)');

  const userIcon = page.locator('div.HeaderMenu_customer__ymyVN').first();
  await userIcon.waitFor({ state: 'visible', timeout: 10000 });
  await userIcon.click();
  console.log('✅ Кликнули по иконке пользователя');

  await page.waitForSelector('input[type="email"], input[name="email"], input[name="login"]');
  console.log('✅ Форма авторизации загружена');

  const loginField = page.locator('input[name="login"]');
  await loginField.waitFor({ state: 'visible', timeout: 10000 });
  await loginField.fill(process.env.DROPP_EMAIL || '');
  console.log('✅ Логин введён');

  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill(process.env.DROPP_PASSWORD || '');
  console.log('✅ Пароль введён');

  const submitButton = page.locator('[data-test-id="popup-sign-in-button"]');
  await submitButton.click();
  console.log('✅ Нажали кнопку входа');

  await page.waitForTimeout(1000);
}