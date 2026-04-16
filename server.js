const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const path = require('path');
const multer = require('multer');
const upload = multer({ dest: 'public/images/' });
const app = express();
const mysql = require('mysql');
const dbConn = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    queueLimit: 10
});

const bcrypt = require('bcrypt');
const salt = bcrypt.genSaltSync(13);
const session = require('express-session');

//middleware
app.use(express.static(path.join(__dirname, 'public'))); // to static files from public folder
app.use(express.urlencoded({ extended: true })); //to parse form data
app.use(express.json()); //to parse json data
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
}));

//index route
app.get('/', (req, res) => {
  const sql = `
    SELECT * FROM products
    WHERE is_active = 1
    ORDER BY RAND()
    LIMIT 6
  `;

  dbConn.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching featured products:", err);
      return res.render('index.ejs', { products: [] });
    }

    res.render('index.ejs', { products: results });
  });
});


app.get('/order', (req, res) => {
    res.render('order.ejs');
});

//Authentication routes
app.get('/register', (req, res) => {
    res.render('register.ejs');
});

app.get("/login", (req, res) => {
  const message = req.query.message;
  if (message === "exists") {
    res.locals.message = "Email already exists. Please login.";
  } else if (message === "success") {
    res.locals.message = "Registration successful. Please login.";
  } else if (message === "invalid") {
    res.locals.message = "Invalid email or password. Try again";
  } else if (message === "unauthorized") {
    res.locals.message = "Your are unauthorized to access that page.";
  }
  res.render("login.ejs");
});

app.post('/checkout', (req, res) => {
  const {
    customerName,
    customerEmail,
    customerPhone,
    specialInstructions,
    customerPassword,
    orderType,
    date,
    time,
    items
  } = req.body;

  const nameParts = customerName.trim().split(' ');
  const first_name = nameParts[0];
  const last_name = nameParts.slice(1).join(' ') || '';
  const email = customerEmail;
  const phone = customerPhone;
  const instructions = specialInstructions;
  const password = customerPassword;

  if (!first_name || !last_name || !email || !phone || !orderType || !date || !time || !items || items.length === 0) {
    return res.status(400).json({ message: 'Missing required fields or empty cart.' });
  }

  // Check if customer already exists
  const findCustomer = 'SELECT id FROM customers WHERE email = ?';
  dbConn.query(findCustomer, [email], (err, results) => {
    if (err) {
      console.error('Error checking customer:', err);
      return res.status(500).json({ message: 'Database error while checking customer.' });
    }

    if (results.length > 0) {
      // Existing customer found
      const customerId = results[0].id;
      saveOrder(customerId);
    } else {
      // New customer → create record
      let hashedPassword = null;
      if (password && password.trim() !== '') {
        hashedPassword = bcrypt.hashSync(password, salt);
      }

      const insertCustomer = `
        INSERT INTO customers (first_name, last_name, email, phone)
        VALUES (?, ?, ?, ?)
      `;
      dbConn.query(insertCustomer, [first_name, last_name, email, phone], (err, result) => {
        if (err) {
          console.error('Error creating customer:', err);
          return res.status(500).json({ message: 'Error creating new customer.' });
        }

        const customerId = result.insertId;
        saveOrder(customerId);
      });
    }
  });

  // Save the main order
  function saveOrder(customerId) {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = subtotal * 0.08;
    const deliveryFee = 0;
    const total = subtotal + tax;
    const orderType = "pickup";

    // Generate unique order number (e.g., ORD-20251106-12345)
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const insertOrder = `
      INSERT INTO orders (order_number, customer_id, special_instructions, order_type, order_date, order_time, pickup_date, pickup_time, total_price)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    dbConn.query(
      insertOrder,
      [orderNumber, customerId, instructions, "pickup", date, time, date, time, total],
      (err, result) => {
        if (err) {
          console.error('Error saving order:', err);
          return res.status(500).json({ message: 'Error saving order.' });
        }

        const orderId = result.insertId;

        // Save order items
        saveOrderItems(orderId, items);

        return res.json({ message: 'Order placed successfully!' });
      }
    );
  }

  // Save each item in the order_items table
  function saveOrderItems(orderId, items) {
    if (!items || items.length === 0) return;

    const insertItems = `
      INSERT INTO order_items (order_id, product_id, quantity, unit_price, total )
      VALUES ?
    `;

    const values = items.map(item => [orderId, item.id, item.quantity, item.price, item.price * item.quantity]);

    dbConn.query(insertItems, [values], (err) => {
      if (err) console.error('Error saving order items:', err);
    });
  }
});



// Admin Login Page
app.get('/admin/login', (req, res) => {
  res.render('admin-login.ejs'); 
});

// Admin Login
app.post('/admin/login', (req, res) => {
  const { email, password } = req.body;

  // Simple authentication example (replace with DB check later)
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    // You could use session or JWT later for actual login
    res.redirect('/admin/dashboard');
  } else {
    res.render('admin-login.ejs', { error: 'Invalid credentials. Please try again.' });
  }
});

// Admin Dashboard Page
app.get('/admin/dashboard', (req, res) => {
  // get total orders count
  const ordersCountQuery = 'SELECT COUNT(*) as totalOrders FROM orders';
  
  // get total sales
  const totalSalesQuery = 'SELECT SUM(total_price) as totalSales FROM orders WHERE status != "cancelled"';

  // get unique customers count
  const customersCountQuery = 'SELECT COUNT(*) as totalCustomers FROM customers';

  // get products count
  const productsCountQuery = 'SELECT COUNT(*) as totalProducts FROM products';
  
  // get recent orders
  const recentOrdersQuery = `
  SELECT 
    o.id,
    o.order_number,
    CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
    c.email AS customer_email,
    o.total_price,
    o.order_date
  FROM orders o
  JOIN customers c ON o.customer_id = c.id
  ORDER BY o.order_date DESC
  LIMIT 10
  `;

  // Execute all queries
  dbConn.query(ordersCountQuery, (err1, ordersResult) => {
    if (err1) {
      console.error('Error fetching orders count:', err1);
      return res.status(500).send('Error loading dashboard');
    }

    dbConn.query(totalSalesQuery, (err2, salesResult) => {
      if (err2) {
        console.error('Error fetching sales:', err2);
        return res.status(500).send('Error loading dashboard');
      }

      dbConn.query(customersCountQuery, (err3, customersResult) => {
        if (err3) {
          console.error('Error fetching customers count:', err3);
          return res.status(500).send('Error loading dashboard');
        }

        dbConn.query(productsCountQuery, (err4, productsResult) => {
          if (err4) {
            console.error('Error fetching products count:', err4);
            return res.status(500).send('Error loading dashboard');
          }

          dbConn.query(recentOrdersQuery, (err5, recentOrders) => {
            if (err5) {
              console.error('Error fetching recent orders:', err5);
              return res.status(500).send('Error loading dashboard');
            }

            // Render the dashboard with all data
            res.render('admin-dashboard.ejs', {
              totalOrders: ordersResult[0].totalOrders || 0,
              totalSales: salesResult[0].totalSales || 0,
              totalCustomers: customersResult[0].totalCustomers || 0,
              totalProducts: productsResult[0].totalProducts || 0,
              recentOrders: recentOrders
            });
          });
        });
      });
    });
  });
});


app.get('/admin/products', (req, res) => {
  const query = 'SELECT * FROM products';

  dbConn.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching products:', err);
      return res.status(500).send('Error loading products');
    }
    res.render('admin-products.ejs', { products: results });
  });
});


// Add new product (Admin)
app.post('/admin/products', upload.single('image'), (req, res) => {
  const { name, description, price, category, is_active, requires_advance } = req.body;
  const imageUrl = req.file ? `/images/${req.file.filename}` : null;

  const query = `
    INSERT INTO products 
    (name, description, price, category, is_active, requires_advance_notice, image_url) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  dbConn.query(
    query,
    [name, description, price, category, is_active || 1, requires_advance || 0, imageUrl],
    (err, result) => {
      if (err) {
        console.error('Error adding product:', err);
        return res.status(500).json({ message: 'Error adding product', error: err });
      }

      res.status(200).json({
        message: 'Product added successfully',
        productId: result.insertId,
        image_url: imageUrl,
      });
    }
  );
});

// Render Edit Product form
app.get('/admin/products/:id/edit', (req, res) => {
    const productId = req.params.id;

    const query = 'SELECT * FROM products WHERE id = ?';
    dbConn.query(query, [productId], (err, results) => {
        if (err) {
            console.error('Error fetching product:', err);
            return res.status(500).send('Database error');
        }

        if (results.length === 0) {
            return res.status(404).send('Product not found');
        }

        const product = results[0];
        res.render('editProduct.ejs', { product });
    });
});


// Handle Edit Product
app.post('/admin/products/:id/edit', upload.single('image'), (req, res) => {
  const productId = req.params.id;
  const { name, description, price, category, requires_advance_notice } = req.body;

  // Base values for the query
  let values = [name, description, price, category, requires_advance_notice];
  let imageQueryPart = '';

  // If a new image is uploaded, include it in the query
  if (req.file) {
    imageQueryPart = ', image_url = ?';
    values.push(`/images/${req.file.filename}`);
  }

  // Add the productId to the values array for the WHERE clause
  values.push(productId);

  // Build the final query
  const query = `
    UPDATE products
    SET name = ?, description = ?, price = ?, category = ?, requires_advance_notice = ?
    ${imageQueryPart}
    WHERE id = ?
  `;

  dbConn.query(query, values, (err) => {
    if (err) {
      console.error('Error updating product:', err);
      return res.status(500).send("Error updating product");
    }
    res.redirect('/admin/products');
  });
});


app.post('/admin/products/:id/delete', (req, res) => {
  const productId = req.params.id;

  const sql = "DELETE FROM products WHERE id = ?";

  dbConn.query(sql, [productId], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Error deleting product");
    }

    res.redirect('/admin/products');
  });
});



app.get('/admin/orders/:id', (req, res) => {
    const orderId = req.params.id;
    const updated = req.query.updated === "true";

    const orderQuery = `
      SELECT orders.*,
      CONCAT(customers.first_name, ' ', customers.last_name) AS customer_name,
      customers.email AS customer_email,
      customers.phone AS customer_phone
      FROM orders
      JOIN customers ON orders.customer_id = customers.id
      WHERE orders.id = ?
    `;

    const itemsQuery = `
      SELECT 
        order_items.quantity,
        order_items.unit_price AS price,
        order_items.total AS subtotal,
        products.name AS product_name
      FROM order_items
      JOIN products ON order_items.product_id = products.id
      WHERE order_items.order_id = ?
    `;

    dbConn.query(orderQuery, [orderId], (err, orderResult) => {
        if (err) throw err;

        if (orderResult.length === 0) {
            return res.render("orderDetails.ejs", {
                order: null,
                items: [],
                error: "Order not found",
                updated: false
            });
        }

        const orderData = orderResult[0];

        dbConn.query(itemsQuery, [orderId], (err, itemsResult) => {
            if (err) throw err;

            res.render("orderDetails.ejs", {
                order: orderData,
                items: itemsResult,
                error: null,
                updated: updated
            });
        });
    });
});


app.post('/admin/orders/:id/status', (req, res) => {
    const orderId = req.params.id;
    const newStatus = req.body.status;

    const sql = "UPDATE orders SET status = ? WHERE id = ?";
    dbConn.query(sql, [newStatus, orderId], (err) => {
        if (err) throw err;
        res.redirect(`/admin/orders/${orderId}?updated=true`);
    });
});



// about
app.get('/about', (req, res) => {
    res.render('about.ejs');
}); 

// products
app.get('/products', (req, res) => {
  const sql = "SELECT * FROM products";

  dbConn.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching products:", err);
      return res.status(500).send("Error fetching products from database");
    }
    res.render('products.ejs', { products: results });
  });
});


app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
      res.status(500).send("Error logging out");
    } else {
      res.redirect("/");
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});