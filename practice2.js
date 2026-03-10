const cart = [
  { name: "Мышь", quantity: 2, price: 1500 },
  { name: "Ноутбук", quantity: 1, price: 75000 },
  { name: "Наушники", quantity: 3, price: 5000 }
];

function sumCart(cart) {
    return cart.reduce ((total, item)=>{
        return total + (item.quantity * item.price);}, 0);
    }
  
const vivod = sumCart(cart);
console.log(vivod)