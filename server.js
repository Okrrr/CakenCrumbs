const express = require('express');
const path = require('path');
const multer = require('multer');
const upload = multer({ dest: 'public/images/' });
const app = express();
const mysql = require('mysql');
const dbConn = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Korir@01',
    database: 'bakery_management',
});

const bcrypt = require('bcrypt');
const salt = bcrypt.genSaltSync(13);
const session = require('express-session');

//middleware
app.use(express.static(path.join(__dirname, 'public'))); //static files will be served from public folder
app.use(express.urlencoded({ extended: true })); //to parse form data
app.use(express.json()); //to parse json data
app.use(session({
    secret: 'kipngetich_soymining',
    resave: false,
    saveUninitialized: true,
}));

//index route
app.get('/', (req, res) => {
    res.render('index.ejs');
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
    name,
    email,
    phone,
    instructions,
    password,
    orderType,
    date,
    time,
    items
  } = req.body;

  if (!name || !email || !phone || !orderType || !date || !time || !items || items.length === 0) {
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
        INSERT INTO customers (name, email, phone)
        VALUES (?, ?, ?)
      `;
      dbConn.query(insertCustomer, [name, email, phone], (err, result) => {
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
      INSERT INTO order_items (order_id, product_id, quantity, unit_price, line_total )
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
  const ADMIN_EMAIL = 'admin@cakencrumbs.com';
  const ADMIN_PASSWORD = 'bakery123';

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
    c.name AS customer_name,
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

// Add new product (Admin)
app.post('/admin/products', upload.single('image'), (req, res) => {
  const { name, description, price, category, is_active, requires_advance } = req.body;
  const imageUrl = req.file ? `/images/${req.file.filename}` : null;

  const query = `
    INSERT INTO products 
    (name, description, price, category, is_active, requires_advance, image_url) 
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


app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});