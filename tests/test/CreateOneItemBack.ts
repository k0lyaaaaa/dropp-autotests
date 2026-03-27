import { APIRequestContext } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config();

export async function createBackItem(request: APIRequestContext): Promise<string> {

  // 1. Логин
  await request.post('https://dev.dropp.market/medusa/store/auth', {
    data: {
      email: process.env.DROPP_EMAIL,
      password: process.env.DROPP_PASSWORD
    }
  });
  console.log('✅ Авторизован');

  // 2. Получаем список доступных товаров
  const productsResponse = await request.get('https://dev.dropp.market/medusa/store/products', {
    params: { limit: 100 }
  });
  
  const products = (await productsResponse.json()).products || [];
  const availableProducts = products.filter((p: { variants: any[]; }) => 
    p.variants?.some(v => v.inventory_quantity > 0)
  );
  
  if (availableProducts.length < 3) {
    throw new Error('❌ Недостаточно товаров в наличии');
  }
  
  // 3. Выбираем случайные товары (14 штук)
  const shuffled = [...availableProducts];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  const selectedProducts = shuffled.slice(0, 14);
  console.log(`🎲 Выбрано товаров: ${selectedProducts.length}`);
  
  // 4. Создаём корзину
  console.log('📦 Создаём корзину...');
  const createCartResponse = await request.post('https://dev.dropp.market/medusa/store/carts');
  const cartData = await createCartResponse.json();
  const cart = cartData.cart || cartData;
  console.log(`🛒 Корзина: ${cart.id}`);
  
  // 5. Добавляем адрес доставки
  console.log('📦 Добавляем адрес доставки...');
  await request.post(`https://dev.dropp.market/medusa/store/carts/${cart.id}`, {
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
  console.log('✅ Адрес добавлен');
  
  // 6. Добавляем все выбранные товары в корзину
  let totalAmount = 0;
  const orderItems = [];
  
  for (let i = 0; i < selectedProducts.length; i++) {
    const product = selectedProducts[i];
    const variant = product.variants.find((v: { inventory_quantity: number; }) => v.inventory_quantity > 0);
    
    console.log(`🛍️ Добавляем товар ${i + 1}: ${product.title}`);
    
    const addItemResponse = await request.post(`https://dev.dropp.market/medusa/store/carts/${cart.id}/line-items`, {
      data: {
        variant_id: variant.id,
        quantity: 1
      }
    });
    
    if (addItemResponse.status() !== 200) {
      console.log(`   ❌ Ошибка добавления: ${product.title}`);
      continue;
    }
    
    // Получаем информацию о добавленном товаре
    const itemData = await addItemResponse.json();
    const lineItem = itemData.line_item || itemData;
    orderItems.push({
      title: product.title,
      price: variant.unit_price || lineItem.unit_price,
      variant_id: variant.id
    });
    
    totalAmount += variant.unit_price || 0;
    console.log(`   ✅ Добавлен, цена: ${variant.unit_price} RUB`);
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log(`💰 Общая сумма корзины: ${totalAmount} RUB`);
  
  // 7. Получаем актуальную сумму
  const cartResponse = await request.get(`https://dev.dropp.market/medusa/store/carts/${cart.id}`);
  const cartData2 = await cartResponse.json();
  const finalTotal = cartData2.cart?.total || totalAmount;
  console.log(`💰 Итоговая сумма: ${finalTotal} RUB`);
  
  // 8. Оформляем заказ
  console.log('📦 Оформляем заказ...');
  const orderResponse = await request.post(`https://dev.dropp.market/medusa/store/carts/${cart.id}/complete`);
  const orderData = await orderResponse.json();
  const order = orderData.data || orderData;

  const orderNumber = (order.dropp_display_id || order.display_id || '').toString().replace(/^ARBC-/, '');
  console.log(`✅ Заказ создан: ARBC-${orderNumber}`);
  console.log(`🆔 ID заказа: ${order.id}`);
  console.log(`📦 Количество товаров в заказе: ${order.items?.length || orderItems.length}`);
  
  // 9. Оплачиваем
  console.log('💳 Оплачиваем заказ...');
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
  console.log(`💰 Сумма: ${finalTotal} RUB`);
  console.log(`🛍️ Товары:`);
  orderItems.forEach((item, idx) => {
    console.log(`   ${idx + 1}. ${item.title} — ${item.price} RUB`);
  });
  
  return `ARBC-${orderNumber}`;
}