const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();

app.use(cors({
  origin: [
    'http://localhost:3000',
    /\.railway\.app$/,  
    /\.vercel\.app$/,   
    /\.netlify\.app$/   
  ],
  credentials: true
}));

app.use(bodyParser.json());

// Create connection pool instead of single connection
const pool = mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
});

// Get a promise-based interface to the pool
const promisePool = pool.promise();

// Test connection on startup
async function testConnection() {
  try {
    const connection = await promisePool.getConnection();
    console.log("✅ Connected to MySQL Database successfully!");
    console.log("Host:", process.env.MYSQLHOST);
    console.log("Database:", process.env.MYSQLDATABASE);
    connection.release();
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
  }
}

testConnection();

// Health check endpoint
app.get("/", (req, res) => {
  res.json({ 
    message: "Citizen Registry API is running!",
    status: "success",
    timestamp: new Date().toISOString(),
    database: process.env.MYSQLDATABASE,
    host: process.env.MYSQLHOST
  });
});

// Database health check
app.get("/health", async (req, res) => {
  try {
    const [results] = await promisePool.query("SELECT 1");
    res.json({ 
      status: "healthy", 
      database: "connected",
      timestamp: new Date().toISOString(),
      host: process.env.MYSQLHOST
    });
  } catch (err) {
    res.status(500).json({ 
      status: "error", 
      message: "Database connection failed",
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get all countries
app.get("/countries", async (req, res) => {
  try {
    const [results] = await promisePool.query("SELECT * FROM country");
    res.json(results);
  } catch (err) {
    console.error("Error fetching countries:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

// Get territories by country ID
app.get("/territories/:countryId", async (req, res) => {
  try {
    const countryId = req.params.countryId;
    const [results] = await promisePool.query("SELECT * FROM terrotory WHERE CountryID = ?", [countryId]);
    res.json(results);
  } catch (err) {
    console.error("Error fetching territories:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

// Get districts by territory ID
app.get("/districts/:territoryId", async (req, res) => {
  try {
    const territoryId = req.params.territoryId;
    const [results] = await promisePool.query("SELECT * FROM district WHERE TerritoryID = ?", [territoryId]);
    res.json(results);
  } catch (err) {
    console.error("Error fetching districts:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

// Get seats by district ID
app.get("/seats/:districtId", async (req, res) => {
  try {
    const districtId = req.params.districtId;
    const [results] = await promisePool.query("SELECT * FROM Seat WHERE DistricID = ?", [districtId]);
    res.json(results);
  } catch (err) {
    console.error("Error fetching seats:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

// Add new citizen
app.post("/citizens", async (req, res) => {
  try {
    const {
      CountryID, TerritoryID, DistrictID, SeatID, CitizenName, NIC, City, 
      Address1, Address2, DOB, Job, Salary, MaritalStatus, Auser, Muser, Terminal
    } = req.body;

    const sql = "INSERT INTO citizens (CountryID, TerritoryID, DistrictID, SeatID, CitizenName, NIC, City, Address1, Address2, DOB, Job, Salary, MaritalStatus, Auser, Muser, Terminal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    const [result] = await promisePool.execute(sql, [
      CountryID, TerritoryID, DistrictID, SeatID, CitizenName, NIC, City, 
      Address1, Address2, DOB, Job, Salary, MaritalStatus, Auser, Muser, Terminal
    ]);

    res.status(201).json({ message: "Citizen added successfully", id: result.insertId });
  } catch (err) {
    console.error("Error inserting citizen:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

// Add new country
app.post("/countries", async (req, res) => {
  try {
    const { CountryID, CountryName, Auser, Muser, Terminal } = req.body;
    const sql = "INSERT INTO country(CountryID, CountryName, Auser, Muser, Terminal) VALUES(?, ?, ?, ?, ?)";
    
    const [result] = await promisePool.execute(sql, [CountryID, CountryName, Auser, Muser, Terminal]);
    res.status(201).json({ message: "Country added successfully", id: result.insertId });
  } catch (err) {
    console.error("Error adding country:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

// Add new territory
app.post("/territories", async (req, res) => {
  try {
    const { CountryID, TerritoryName, TerritoryShortName, Auser, Muser, Terminal } = req.body;
    const sql = "INSERT INTO terrotory(CountryID, TerritoryName, TerritoryShortName, Auser, Muser, Terminal) VALUES(?, ?, ?, ?, ?, ?)";
    
    const [result] = await promisePool.execute(sql, [CountryID, TerritoryName, TerritoryShortName, Auser, Muser, Terminal]);
    res.status(201).json({ message: "Territory added successfully", id: result.insertId });
  } catch (err) {
    console.error("Error adding territory:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

// Add new district
app.post("/districts", async (req, res) => {
  try {
    const { CountryID, TerritoryID, DistrictName, Auser, Muser, Terminal } = req.body;
    const sql = "INSERT INTO district (CountryID, TerritoryID, DistrictName, Auser, Muser, Terminal) VALUES(?, ?, ?, ?, ?, ?)";
    
    const [result] = await promisePool.execute(sql, [CountryID, TerritoryID, DistrictName, Auser, Muser, Terminal]);
    res.status(201).json({ message: "District added successfully", id: result.insertId });
  } catch (err) {
    console.error("Error adding district:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

// Add new seat
app.post("/seats", async (req, res) => {
  try {
    const { CountryID, TerritoryID, DistricID, SeatDescption, Auser, Muser, Terminal } = req.body;
    const sql = "INSERT INTO Seat(CountryID, TerritoryID, DistricID, SeatDescption, Auser, Muser, Terminal) VALUES(?, ?, ?, ?, ?, ?, ?)";
    
    const [result] = await promisePool.execute(sql, [CountryID, TerritoryID, DistricID, SeatDescption, Auser, Muser, Terminal]);
    res.status(201).json({ message: "Seat added successfully", id: result.insertId });
  } catch (err) {
    console.error("Error adding seat:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

// Get citizens by district
app.get("/citizens/district/:districtId", async (req, res) => {
  try {
    const districtId = req.params.districtId;
    const [results] = await promisePool.query("SELECT * FROM citizens WHERE DistrictID = ?", [districtId]);
    res.json(results);
  } catch (err) {
    console.error("Error fetching citizens by district:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

// Get citizens by seat
app.get("/citizens/seat/:seatId", async (req, res) => {
  try {
    const seatId = req.params.seatId;
    const [results] = await promisePool.query("SELECT * FROM citizens WHERE SeatID = ?", [seatId]);
    res.json(results);
  } catch (err) {
    console.error("Error fetching citizens by seat:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

// Get all citizens
app.get("/citizens", async (req, res) => {
  try {
    const [results] = await promisePool.query("SELECT * FROM citizens");
    res.json(results);
  } catch (err) {
    console.error("Error fetching all citizens:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: err.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.path 
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(` Server running on port ${PORT}`);
  console.log(` Database: ${process.env.MYSQLDATABASE}`);
  console.log(` Host: ${process.env.MYSQLHOST}`);
});