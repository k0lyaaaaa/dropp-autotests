// createOrderWithMultipleItems.ts
import { APIRequestContext } from "@playwright/test";
import { setTimeout as sleep } from "node:timers/promises";
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

const shippingAddress = {
  first_name: "Nikolay",
  last_name: "Тестик",
  address_1: "Английский пр-кт",
  city: "г Санкт-Петербург",
  country_code: "ru",
  postal_code: "440011",
  phone: "+79874330832",
};

function getVariantPrice(variant: any): number {
  let priceInRubles = 0;

  if (
    variant.prices &&
    Array.isArray(variant.prices) &&
    variant.prices.length > 0
  ) {
    const priceEntry =
      variant.prices.find((p: any) => p.currency_code === "rub") ||
      variant.prices[0];
    const priceInKopecks = priceEntry?.amount || 0;
    priceInRubles = Math.floor(priceInKopecks / 1);
  }

  if (priceInRubles === 0) {
    const fallbackPrice =
      variant.calculated_price || variant.original_price || 0;
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
  const loginResponse = await request.post(
    "https://dev.dropp.market/medusa/store/auth",
    {
      data: {
        email: process.env.DROPP_EMAIL,
        password: process.env.DROPP_PASSWORD,
      },
    }
  );

  if (loginResponse.status() !== 200) {
    throw new Error("❌ Ошибка авторизации");
  }
  console.log("✅ Авторизован");
  const limit = 50;
  let offset = 0;
  let totalAmount = 0;
  let successfullyAdded = 0;

  const orderItems: OrderItem[] = [];

  // 2. Создаём корзину
  console.log("📦 Создаём корзину...");
  const createCartResponse = await request.post(
    "https://dev.dropp.market/medusa/store/carts"
  );
  const cartData = await createCartResponse.json();
  const cart = cartData.cart || cartData;
  console.log(`🛒 Корзина: ${cart.id}`);

  // 3. Добавляем адрес доставки
  console.log("📦 Добавляем адрес доставки...");
  await request.post(`https://dev.dropp.market/medusa/store/carts/${cart.id}`, {
    data: {
      shipping_address: shippingAddress,
    },
  });
  console.log("✅ Адрес добавлен");

  console.log(`🔍 Ищем подходящие товары (нужно найти ${itemsCount})...`);
  while (successfullyAdded < itemsCount) {
    const toAdd: { variant_id: string; quantity: number; title: string; price: number }[] = [];

    // 4. Получаем все товары
    console.log("📦 Загружаем каталог...");
    const productsResponse = await request.get(
      "https://dev.dropp.market/medusa/store/products",
      {
        params: { limit, offset },
      }
    );
    const data = await productsResponse.json();
    console.log(`📦 Загружено товаров: ${data.products.length}`);
    if (data.products.length === 0) break;

    const shuffled = [...data.products];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const potentialItemsCount = 10;
    for (const item of shuffled) {
      if (toAdd.length >= potentialItemsCount) break;

      for (const variant of item.variants) {
        if (toAdd.length >= potentialItemsCount) break;
        const price = getVariantPrice(variant);
        const canProcess =
          isVariantAvailable(variant) && price > 0 && price <= 35000;
        if (!canProcess) continue;
        toAdd.push({
          variant_id: variant.id,
          quantity: 1,
          title: item.title,
          price,
        });
        console.log(`   🔎 Кандидат найден: ${item.title}`);
      }
    }
    // 5. Добавляем товары в корзину
    console.log(`📦 Добавляем ${toAdd.length} кандидатов в корзину...`);
    for await (const item of toAdd) {
      if (successfullyAdded >= itemsCount) break;
      const addItemResponse = await request.post(
        `https://dev.dropp.market/medusa/store/carts/${cart.id}/line-items`,
        {
          data: { variant_id: item.variant_id, quantity: item.quantity },
        }
      );
      if (addItemResponse.status() !== 200) {
        console.log(`   ❌ Ошибка добавления: ${item.title}`);
        continue;
      }
      orderItems.push({ title: item.title, price: item.price, variant_id: item.variant_id });
      totalAmount += item.price;
      successfullyAdded++;
      console.log(`   ✅ Добавлен в корзину (${successfullyAdded}/${itemsCount}): ${item.title}`);
      await sleep(300);
    }
    if (successfullyAdded >= itemsCount) break;
    offset += limit;
  }
  console.log(`💰 Общая сумма: ${totalAmount} ₽`);
  if (successfullyAdded === 0) {
    throw new Error("❌ Не удалось добавить ни одного товара");
  }

  if (successfullyAdded < itemsCount) {
    console.log(
      `⚠️ Удалось добавить только ${successfullyAdded} из ${itemsCount} товаров`
    );
  } else {
    console.log(`✅ Успешно добавлено ${successfullyAdded} товаров`);
  }

  // 6. Получаем актуальную сумму
  const cartResponse = await request.get(
    `https://dev.dropp.market/medusa/store/carts/${cart.id}`
  );
  const cartData2 = await cartResponse.json();
  const cartTotalInKopecks = cartData2.cart?.total || 0;
  const finalTotal = Math.floor(cartTotalInKopecks / 100);
  console.log(`💰 Итоговая сумма: ${finalTotal} ₽`);

  // 7. Оформляем заказ
  console.log("📦 Оформляем заказ...");
  const orderResponse = await request.post(
    `https://dev.dropp.market/medusa/store/carts/${cart.id}/complete`
  );
  const orderData = await orderResponse.json();
  const order = orderData.data || orderData;

  const orderNumber = (order.dropp_display_id || order.display_id || "")
    .toString()
    .replace(/^ARBC-/, "");
  console.log(`✅ Заказ создан: ARBC-${orderNumber}`);
  console.log(`🆔 ID заказа: ${order.id}`);
  console.log(
    `📦 Количество товаров в заказе: ${
      order.items?.length || orderItems.length
    }`
  );

  // 8. Оплачиваем (как в рабочих тестах)
  console.log("💳 Оплачиваем заказ...");
  const paymentResponse = await request.post(
    "https://dev.dropp.market/medusa/store/dropp/payment",
    {
      data: {
        orderId: order.id,
        paymentProvider: "mobi",
        language: "ru-RU",
      },
    }
  );
  console.log(`💳 Оплата: ${paymentResponse.status()}`);

  if (paymentResponse.status() !== 200) {
    const errorText = await paymentResponse.text();
    throw new Error(
      `❌ Ошибка оплаты заказа: ${paymentResponse.status()} — ${errorText.substring(
        0,
        200
      )}`
    );
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
    items: orderItems,
  };
};
