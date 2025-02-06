const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'img/'); // Specify the directory to store uploaded files
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Use timestamp as filename
  }
});

const upload = multer({ storage: storage });

// MySQL connection
const db = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT,
  connectTimeout: 10000 // Increase timeout to 10 seconds
});



// Use your Railway MySQL URL if you are connecting to the Railway database
// const db = mysql.createConnection({
//     host: 'your-railway-host', 
//     user: 'your-railway-user', 
//     password: 'your-railway-password', 
//     database: 'your-railway-database'
// });

db.connect(err => {
  if (err) {
    console.error('Failed to connect to MySQL:', err);
    process.exit(1); // Exit if the database connection fails
  }
  console.log('Connected to MySQL');
});

// Register new user with profile image
app.post('/register', upload.single('profileimage'), (req, res) => {
  console.log(req.body);
  console.log(req.file);
  const { firstName, lastName, age, address, city, country, postcode, mobile, email, occupation } = req.body;
  const profileImage = req.file ? req.file.path : 'img/userfind.png'; // Default image if no file is uploaded

  // Check if all required fields are provided
  if (!firstName || !lastName || !age || !address || !city || !country || !postcode || !mobile || !email || !occupation) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  const sql = 'INSERT INTO users (first_name, last_name, age, address, city, country, postcode, mobile, email, occupation, profile_image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
  db.execute(sql, [firstName, lastName, age, address, city, country, postcode, mobile, email, occupation, profileImage], (err, result) => {
    if (err) {
      console.error('Error registering user:', err);
      return res.status(500).send('Server error');
    }
    res.status(200).json({ message: 'User registered successfully' });
  });
});

// Get list of service providers based on occupation
app.get('/drivers', (req, res) => {
  const occupation = req.query.occupation; // Get occupation from query parameters
  if (!occupation) {
    return res.status(400).json({ message: 'Occupation is required' });
  }

  const sql = 'SELECT id, first_name, last_name, occupation, profile_image FROM users WHERE occupation = ?';
  db.query(sql, [occupation], (err, results) => {
    if (err) {
      console.error('Error fetching drivers:', err.message);
      return res.status(500).send('Server error');
    }

    // If no drivers are found, return an empty array
    if (results.length === 0) {
      return res.status(404).json({ message: 'No drivers found' });
    }

    // Map through the results and format them
    const drivers = results.map(driver => {
      const imageUrl = driver.profile_image || 'img/userfind.png'; // Use the image URL from the DB or a default image
      return {
        id: driver.id,
        name: `${driver.first_name} ${driver.last_name}`,
        category: driver.occupation,
        image: imageUrl
      };
    });

    res.json(drivers); // Send the list of drivers as a JSON response
  });
});

// Get details of a specific provider
app.get('/drivers/:id', (req, res) => {
  const providerId = req.params.id; // Get the provider ID from URL parameter
  const sql = 'SELECT first_name, last_name, occupation, profile_image, mobile FROM users WHERE id = ?';

  db.query(sql, [providerId], (err, results) => {
    if (err) {
      console.error('Error fetching provider info:', err.message);
      return res.status(500).send('Server error');
    }

    // If no provider is found
    if (results.length === 0) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    const provider = results[0];
    const imageUrl = provider.profile_image || 'img/userfind.png'; // Use the image URL from the DB or a default image
    res.json({
      name: `${provider.first_name} ${provider.last_name}`,
      occupation: provider.occupation,
      contact: provider.mobile,
      image: imageUrl,
      description: provider.description || 'No description available'
    });
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
