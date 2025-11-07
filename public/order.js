
// Product Data
const products = [
    {
        id: 1,
        name: "Sourdough Bread",
        description: "Slow-fermented for 24 hours for optimal flavor and texture",
        price: 700.00,
        category: "bread",
        image: "https://images.unsplash.com/photo-1587248720328-4daa08f11b9e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=774&q=80"
    },
    {
        id: 2,
        name: "Chocolate Croissant",
        description: "Flaky pastry with premium Belgian chocolate filling",
        price: 450.00,
        category: "pastries",
        image: "https://images.unsplash.com/photo-1559620192-032c4bc4674e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=692&q=80"
    },
    {
        id: 3,
        name: "Berry Tart",
        description: "Buttery shortcrust filled with vanilla custard and fresh berries",
        price: 675.00,
        category: "pastries",
        image: "https://images.unsplash.com/photo-1612203985729-70726954388c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=870&q=80"
    },
    {
        id: 4,
        name: "Chocolate Fudge Cake",
        description: "Rich, moist chocolate cake with creamy fudge frosting",
        price: 2499.00,
        category: "cakes",
        image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1089&q=80"
    },
    {
        id: 5,
        name: "Baguette",
        description: "Traditional French baguette with crispy crust",
        price: 350.00,
        category: "bread",
        image: "https://images.unsplash.com/photo-1568250835-37cdbe7d7fd4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=774&q=80"
    },
    {
        id: 6,
        name: "Chocolate Chip Cookies (6pk)",
        description: "Classic cookies with melty chocolate chips",
        price: 599.00,
        category: "cookies",
        image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1064&q=80"
    }
];

// Shopping Cart
let cart = [];
const cartCount = document.querySelector('.cart-count');
const cartItems = document.getElementById('cart-items');
const subtotalEl = document.getElementById('subtotal');
const taxEl = document.getElementById('tax');
const totalEl = document.getElementById('total');
const deliveryFeeLine = document.getElementById('delivery-fee-line');
const checkoutBtn = document.getElementById('checkout-btn');
const checkoutModal = document.getElementById('checkout-modal');
const closeModal = document.getElementById('close-modal');
const checkoutForm = document.getElementById('checkout-form');
const deliveryAddressGroup = document.getElementById('delivery-address-group');

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    renderProducts();
    setupEventListeners();
    setupDatePicker();
    updateCartDisplay();
});

// Render products to the page
function renderProducts(filterCategory = 'all') {
    const productsGrid = document.getElementById('products-grid');
    productsGrid.innerHTML = '';
    
    const filteredProducts = filterCategory === 'all' 
        ? products 
        : products.filter(product => product.category === filterCategory);
    
    filteredProducts.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <div class="product-img" style="background-image: url('${product.image}')"></div>
            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                <p class="product-desc">${product.description}</p>
                <p class="product-price">Ksh ${product.price.toFixed(2)}</p>
                <button class="add-to-cart" data-id="${product.id}">Add to Cart</button>
            </div>
        `;
        productsGrid.appendChild(productCard);
    });
    
    // Add event listeners to the add to cart buttons
    document.querySelectorAll('.add-to-cart').forEach(button => {
        button.addEventListener('click', function() {
            const productId = parseInt(this.getAttribute('data-id'));
            addToCart(productId);
        });
    });
}

// Set up event listeners
function setupEventListeners() {
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            const category = this.getAttribute('data-category');
            renderProducts(category);
        });
    });
    
    // Delivery options
    document.querySelectorAll('.option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.option').forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            const type = this.getAttribute('data-type');
            
            if (type === 'delivery') {
                deliveryFeeLine.style.display = 'flex';
                deliveryAddressGroup.style.display = 'block';
            } else {
                deliveryFeeLine.style.display = 'none';
                deliveryAddressGroup.style.display = 'none';
            }
            
            updateCartDisplay();
        });
    });
    
    // Checkout button
    checkoutBtn.addEventListener('click', function() {
        if (cart.length === 0) {
            alert('Your cart is empty. Please add some items before checking out.');
            return;
        }
        
        const date = document.getElementById('order-date').value;
        const time = document.getElementById('order-time').value;
        
        if (!date || !time) {
            alert('Please select a pickup/delivery date and time.');
            return;
        }
        
        checkoutModal.style.display = 'flex';
    });
    
    // Close modal
    closeModal.addEventListener('click', function() {
        checkoutModal.style.display = 'none';
    });
    
    // Form submission
    checkoutForm.addEventListener('submit', function(e) {
        e.preventDefault();
        processOrder();
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target === checkoutModal) {
            checkoutModal.style.display = 'none';
        }
    });
}

// Set up the date picker with minimum date as today
function setupDatePicker() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');
    
    const minDate = `${yyyy}-${mm}-${dd}`;
    document.getElementById('order-date').min = minDate;
    document.getElementById('order-date').value = minDate;
    
    // Populate time slots
    populateTimeSlots();
    
    // Update time slots when date changes
    document.getElementById('order-date').addEventListener('change', populateTimeSlots);
}

// Populate time slots based on selected date
function populateTimeSlots() {
    const timeSelect = document.getElementById('order-time');
    timeSelect.innerHTML = '<option value="">Select a time</option>';
    
    // For simplicity, we'll use fixed time slots
    // In a real application, you would check availability for the selected date
    const timeSlots = [
        '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
        '15:00', '15:30', '16:00', '16:30'
    ];
    
    timeSlots.forEach(time => {
        const option = document.createElement('option');
        option.value = time;
        option.textContent = time;
        timeSelect.appendChild(option);
    });
    
    // Select the first available time slot
    if (timeSlots.length > 0) {
        timeSelect.value = timeSlots[0];
    }
}

// Add product to cart
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1
        });
    }
    
    updateCartDisplay();
    
    // Show confirmation
    const confirmation = document.createElement('div');
    confirmation.textContent = `${product.name} added to cart!`;
    confirmation.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: var(--success);
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        z-index: 1000;
        animation: fadeOut 3s forwards;
    `;
    document.body.appendChild(confirmation);
    
    setTimeout(() => {
        document.body.removeChild(confirmation);
    }, 3000);
}

// Update cart display
function updateCartDisplay() {
    // Update cart count
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    
    // Update cart items
    cartItems.innerHTML = '';
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<p class="empty-cart-message">Your cart is empty. Add some delicious items!</p>';
    } else {
        cart.forEach(item => {
            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';
            cartItem.innerHTML = `
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <span class="cart-item-price">Ksh ${item.price.toFixed(2)}</span>
                </div>
                <div class="cart-item-controls">
                    <button class="quantity-btn minus" data-id="${item.id}">-</button>
                    <span>${item.quantity}</span>
                    <button class="quantity-btn plus" data-id="${item.id}">+</button>
                </div>
            `;
            cartItems.appendChild(cartItem);
        });
        
        // Add event listeners to quantity buttons
        document.querySelectorAll('.quantity-btn.minus').forEach(button => {
            button.addEventListener('click', function() {
                const productId = parseInt(this.getAttribute('data-id'));
                updateQuantity(productId, -1);
            });
        });
        
        document.querySelectorAll('.quantity-btn.plus').forEach(button => {
            button.addEventListener('click', function() {
                const productId = parseInt(this.getAttribute('data-id'));
                updateQuantity(productId, 1);
            });
        });
    }
    
    // Update totals
    updateTotals();
}

// Update item quantity in cart
function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    
    if (item) {
        item.quantity += change;
        
        if (item.quantity <= 0) {
            cart = cart.filter(item => item.id !== productId);
        }
        
        updateCartDisplay();
    }
}

// Update order totals
function updateTotals() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.08; // 8% tax
    const isDelivery = document.querySelector('.option[data-type="delivery"]').classList.contains('active');
    const deliveryFee = isDelivery ? 3.99 : 0;
    const total = subtotal + tax + deliveryFee;

    subtotalEl.textContent = `Ksh ${subtotal.toFixed(2)}`;
    taxEl.textContent = `Ksh ${tax.toFixed(2)}`;
    totalEl.textContent = `Ksh ${total.toFixed(2)}`;

    if (isDelivery) {
        deliveryFeeLine.style.display = 'flex';
    }
}

// Process the order
function processOrder() {
  const name = document.getElementById('customer-name').value;
  const email = document.getElementById('customer-email').value;
  const phone = document.getElementById('customer-phone').value;
  const address = document.getElementById('delivery-address').value || null;
  const instructions = document.getElementById('special-instructions').value || null;
  const password = document.getElementById('customer-password').value || null;

  const isDelivery = document.querySelector('.option[data-type="delivery"]').classList.contains('active');
  const orderType = isDelivery ? 'delivery' : 'pickup';

  const date = document.getElementById('order-date').value;
  const time = document.getElementById('order-time').value;

  const orderData = {
    name,
    email,
    phone,
    address,
    instructions,
    password,
    orderType,
    date,
    time,
    items: cart,
  };

  fetch('/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData),
  })
  .then(res => res.json())
  .then(data => {
    alert(data.message);
    checkoutModal.style.display = 'none';
    cart = [];
    updateCartDisplay();
  })
  .catch(err => {
    console.error(err);
    alert('Something went wrong while placing your order.');
  });
}
