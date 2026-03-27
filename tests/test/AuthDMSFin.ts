import { Page } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config();

// Переходим в админку
export async function AuthDMSFin(page: Page) {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('https://dev-dms.dropp.market/orders');
  console.log('✅ Сайт админки открыт');

  // Авторизация в админке
  const adminLogin = page.locator('input[name="email"]');
  await adminLogin.waitFor({ state: 'visible', timeout: 10000 });
  await adminLogin.fill(process.env.DMS_EMAIL_FIN_MANAGER || '');
  console.log('✅ Логин админа введён');

  const adminPassword = page.locator('input[type="password"]').first();
  await adminPassword.fill(process.env.DMS_PASSWORD_FIN_MANAGER || '');
  console.log('✅ Пароль админа введён');

  const adminLoginButton = page.locator('button[type="submit"]');
  await adminLoginButton.click();
  console.log('✅ Нажали кнопку входа в админку');

  await page.waitForTimeout(1000);
}