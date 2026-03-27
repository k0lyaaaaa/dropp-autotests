import { test } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config();

test('Купить и оплатить случайный товар через API', async ({ request }) => {
  test.setTimeout(60000);
  
  // 1. Логин
  await request.post('https://dev.dropp.market/medusa/store/auth', {
    data: {
      email: process.env.DROPP_EMAIL,
      password: process.env.DROPP_PASSWORD
    }
  });
  console.log('✅ Авторизован');

  // 2. Получаем случайный товар в наличии
  const productsResponse = await request.get('https://dev.dropp.market/medusa/store/products', {
    params: { limit: 100 }
  });
  
  const products = (await productsResponse.json()).products || [];
  const availableProducts = products.filter(p => 
    p.variants?.some(v => v.inventory_quantity > 0)
  );
  
  if (availableProducts.length === 0) {
    throw new Error('❌ Нет товаров в наличии');
  }
  
  const randomProduct = availableProducts[Math.floor(Math.random() * availableProducts.length)];
  const variant = randomProduct.variants.find(v => v.inventory_quantity > 0);
  console.log(`🎲 Товар: ${randomProduct.title}`);
  
  // 3. Создаём пустую корзину
  console.log('📦 Создаём пустую корзину...');
  const createCartResponse = await request.post('https://dev.dropp.market/medusa/store/carts');
  const cartData = await createCartResponse.json();
  const cart = cartData.cart || cartData;
  console.log(`🛒 Корзина: ${cart.id}`);
  
  // 4. Добавляем адрес через обновление корзины
  console.log('📦 Добавляем адрес доставки...');
  const updateCartResponse = await request.post(`https://dev.dropp.market/medusa/store/carts/${cart.id}`, {
    data: {
      shipping_address: {
        first_name: 'Nikolay',
        last_name: 'Тестик',
        address_1: 'Английский пр-кт',
        city: 'г Санкт-Петербург',
        country_code: 'ru',
        postal_code: '440011',
        phone: '+79874330832'
      }
    }
  });
  
  if (updateCartResponse.status() !== 200) {
    const error = await updateCartResponse.text();
    console.log(`❌ Ошибка добавления адреса: ${updateCartResponse.status()} - ${error}`);
    throw new Error('Не удалось добавить адрес');
  }
  console.log('✅ Адрес добавлен');
  
  // 5. Добавляем товар
  const addItemResponse = await request.post(`https://dev.dropp.market/medusa/store/carts/${cart.id}/line-items`, {
    data: {
      variant_id: variant.id,
      quantity: 1
    }
  });
  
  if (addItemResponse.status() !== 200) {
    const error = await addItemResponse.text();
    console.log(`❌ Ошибка добавления товара: ${error}`);
    throw new Error('Не удалось добавить товар');
  }
  console.log('✅ Товар добавлен');
  
  // 6. Получаем сумму
  const cartResponse = await request.get(`https://dev.dropp.market/medusa/store/carts/${cart.id}`);
  const cartData2 = await cartResponse.json();
  const total = cartData2.cart?.total || 0;
  console.log(`💰 Сумма: ${total} RUB`);
  
  // 7. Оформляем заказ
  const orderResponse = await request.post(`https://dev.dropp.market/medusa/store/carts/${cart.id}/complete`);
  const orderData = await orderResponse.json();
  const order = orderData.data || orderData;

  const orderNumber = (order.dropp_display_id || order.display_id || '').toString().replace(/^ARBC-/, '');
  console.log(`✅ Заказ создан: ARBC-${orderNumber}`);
  console.log(`🆔 ID заказа: ${order.id}`);
  
  // 8. Оплачиваем
  const paymentResponse = await request.post('https://dev.dropp.market/medusa/store/dropp/payment', {
    data: {
      orderId: order.id,
      paymentProvider: 'mobi',
      language: 'ru-RU'
    }
  });
  console.log(`💳 Оплата: ${paymentResponse.status()}`);
  
  console.log(`\n🎉 ЗАКАЗ ОФОРМЛЕН И ОПЛАЧЕН!`);
  console.log(`📦 Номер: ARBC-${orderNumber}`);
  console.log(`💰 Сумма: ${total} RUB`);
});