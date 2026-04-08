// createOrderWithMultipleItems.ts
import { APIRequestContext } from '@playwright/test';

interface OrderItem {
  title: string;
  price: number;
  variant_id: string;
}

interface OrderResult {
  orderNumber: string;
  orderId: string;
  totalAmount: number;
  itemsCount: number;
  items: OrderItem[];
}

function getVariantPrice(variant: any): number {
  let priceInRubles = 0;
  
  if (variant.prices && Array.isArray(variant.prices) && variant.prices.length > 0) {
    const priceEntry = variant.prices.find((p: any) => p.currency_code === 'rub') 
                    || variant.prices[0];
    const priceInKopecks = priceEntry?.amount || 0;
    priceInRubles = Math.floor(priceInKopecks / 1);
  }
  
  if (priceInRubles === 0) {
    const fallbackPrice = variant.calculated_price || variant.original_price || 0;
    priceInRubles = Math.floor(fallbackPrice / 1);
  }
  
  return priceInRubles;
}

function isVariantAvailable(variant: any): boolean {
  const hasStock = Number(variant.inventory_quantity || 0) > 0;
  const canBackorder = Boolean(variant.allow_backorder);
  const inventoryNotManaged = variant.manage_inventory === false;
  return hasStock || canBackorder || inventoryNotManaged;
}

export const createOrderWithMultipleItems = async (
  request: APIRequestContext,
  itemsCount: number = 14
): Promise<OrderResult> => {
  // 1. Логин
  const loginResponse = await request.post('https://dev.dropp.market/medusa/store/auth', {
    data: {
      email: process.env.DROPP_EMAIL,
      password: process.env.DROPP_PASSWORD
    }
  });
  
  if (loginResponse.status() !== 200) {
    throw new Error('❌ Ошибка авторизации');
  }
  console.log('✅ Авторизован');

  // 2. Получаем все товары
  console.log('📦 Загружаем каталог...');
  const productsResponse = await request.get('https://dev.dropp.market/medusa/store/products', {
    params: { limit: 999 }
  });
  
  const data = await productsResponse.json();
  const products = data.products || [];
  console.log(`📦 Загружено товаров: ${products.length}`);
  
  if (products.length === 0) {
    throw new Error('❌ Не удалось загрузить товары');
  }
  
  // 3. Создаём корзину
  console.log('📦 Создаём корзину...');
  const createCartResponse = await request.post('https://dev.dropp.market/medusa/store/carts');
  const cartData = await createCartResponse.json();
  const cart = cartData.cart || cartData;
  console.log(`🛒 Корзина: ${cart.id}`);
  
  // 4. Добавляем адрес доставки
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
  
  // 5. Перемешиваем товары и ищем подходящие, пока не наберем нужное количество
  const shuffled = [...products];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  let totalAmount = 0;
  const orderItems: OrderItem[] = [];
  
  console.log(`🔍 Ищем подходящие товары (нужно ${itemsCount})...`);
  
  for (let i = 0; i < shuffled.length && orderItems.length < itemsCount; i++) {
    const product = shuffled[i];
    
    // Ищем ВСЕ подходящие варианты у товара
    const suitableVariants = product.variants?.filter((v: any) => {
      const price = getVariantPrice(v);
      return isVariantAvailable(v) && price > 0 && price <= 35000;
    }) || [];
    
    if (suitableVariants.length === 0) {
      // Нет подходящих вариантов - пропускаем товар
      continue;
    }
    
    // Берем первый подходящий вариант
    const variant = suitableVariants[0];
    const price = getVariantPrice(variant);
    
    console.log(`🛍️ Товар ${orderItems.length + 1}: ${product.title} — ${price} ₽ (вариантов: ${suitableVariants.length})`);
    
    const addItemResponse = await request.post(`https://dev.dropp.market/medusa/store/carts/${cart.id}/line-items`, {
      data: {
        variant_id: variant.id,
        quantity: 1
      }
    });
    
    if (addItemResponse.status() !== 200) {
      console.log(`   ❌ Ошибка добавления`);
      continue;
    }
    
    orderItems.push({
      title: product.title,
      price: price,
      variant_id: variant.id
    });
    
    totalAmount += price;
    console.log(`   ✅ Добавлен`);
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  if (orderItems.length === 0) {
    throw new Error('❌ Не удалось добавить ни одного товара');
  }

  if (orderItems.length < itemsCount) {
    console.log(`⚠️ Найдено только ${orderItems.length} из ${itemsCount} товаров`);
  } else {
    console.log(`✅ Успешно добавлено ${orderItems.length} товаров`);
  }
  
  console.log(`💰 Общая сумма: ${totalAmount} ₽`);
  
  // 6. Получаем актуальную сумму
  const cartResponse = await request.get(`https://dev.dropp.market/medusa/store/carts/${cart.id}`);
  const cartData2 = await cartResponse.json();
  const cartTotalInKopecks = cartData2.cart?.total || 0;
  const finalTotal = Math.floor(cartTotalInKopecks / 100);
  console.log(`💰 Итоговая сумма: ${finalTotal} ₽`);
  
  // 7. Оформляем заказ
  console.log('📦 Оформляем заказ...');
  const orderResponse = await request.post(`https://dev.dropp.market/medusa/store/carts/${cart.id}/complete`);
  const orderData = await orderResponse.json();
  const order = orderData.data || orderData;

  const orderNumber = (order.dropp_display_id || order.display_id || '').toString().replace(/^ARBC-/, '');
  console.log(`✅ Заказ создан: ARBC-${orderNumber}`);
  console.log(`🆔 ID заказа: ${order.id}`);
  console.log(`📦 Количество товаров в заказе: ${order.items?.length || orderItems.length}`);
  
  // 8. Оплачиваем (как в рабочих тестах)
  console.log('💳 Оплачиваем заказ...');
  const paymentResponse = await request.post('https://dev.dropp.market/medusa/store/dropp/payment', {
    data: {
      orderId: order.id,
      paymentProvider: 'mobi',
      language: 'ru-RU'
    }
  });
  console.log(`💳 Оплата: ${paymentResponse.status()}`);

  if (paymentResponse.status() !== 200) {
    const errorText = await paymentResponse.text();
    throw new Error(`❌ Ошибка оплаты заказа: ${paymentResponse.status()} — ${errorText.substring(0, 200)}`);
  }

  console.log(`\n🎉 ЗАКАЗ ОФОРМЛЕН И ОПЛАЧЕН!`);
  console.log(`📦 Номер: ARBC-${orderNumber}`);
  console.log(`💰 Сумма: ${finalTotal} ₽`);
  console.log(`🛍️ Товары:`);
  orderItems.forEach((item, idx) => {
    console.log(`   ${idx + 1}. ${item.title} — ${item.price} ₽`);
  });

  return {
    orderNumber,
    orderId: order.id,
    totalAmount: finalTotal,
    itemsCount: orderItems.length,
    items: orderItems
  };
};