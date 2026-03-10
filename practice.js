const products = [
  { name: "Ноутбук", price: 75000, inStock: true },
  { name: "Мышь", price: 1500, inStock: true },
  { name: "Клавиатура", price: 3000, inStock: false },
  { name: "Монитор", price: 25000, inStock: true },
  { name: "Наушники", price: 5000, inStock: false }
];

function findAvailableProducts(products) {
  return products.filter(product => product.inStock === false);
}

// Вызываем функцию и выводим результат в консоль
const availableProducts = findAvailableProducts(products);
console.log(availableProducts);