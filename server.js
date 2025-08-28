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
const db = mysql.createConnection({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT,
  connectTimeout: 60000
});
// Connection retry logic
function connectWithRetry() {
  console.log("Attempting to connect to MySQL database...");
  console.log("Host:", process.env.MYSQLHOST || "switchyard.proxy.rlwy.net");
  console.log("Database:", process.env.MYSQLDATABASE || "railway");
  
  db.connect(err => {
    if (err) {
      console.error("Database connection failed:", err.message);
      console.log("Retrying connection in 5 seconds...");
      setTimeout(connectWithRetry, 5000);
      return;
    }
    console.log("✅ Connected to MySQL Database successfully!");
    console.log("Connected to host:", db.config.host);
    console.log("Database:", db.config.database);
  });
}

// Handle connection errors
db.on('error', (err) => {
  console.error('Database error:', err.message);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log("Connection lost. Reconnecting to database...");
    connectWithRetry();
  }
});

// Start connection
connectWithRetry();

// Health check endpoint
app.get("/", (req, res) => {
  res.json({ 
    message: "Citizen Registry API is running!",
    status: "success",
    timestamp: new Date().toISOString(),
    database: process.env.MYSQLDATABASE || "railway",
    host: process.env.MYSQLHOST || "switchyard.proxy.rlwy.net"
  });
});

// Database health check
app.get("/health", (req, res) => {
  db.query("SELECT 1", (err, results) => {
    if (err) {
      return res.status(500).json({ 
        status: "error", 
        message: "Database connection failed",
        error: err.message,
        timestamp: new Date().toISOString()
      });
    }
    res.json({ 
      status: "healthy", 
      database: "connected",
      timestamp: new Date().toISOString(),
      host: db.config.host
    });
  });
});

// Get all countries
app.get("/countries", (req, res) => {
  db.query("SELECT * FROM country", (err, results) => {
    if (err) {
      console.error("Error fetching countries:", err);
      return res.status(500).json({ error: "Database error", details: err.message });
    }
    res.json(results);
  });
});

// Get territories by country ID
app.get("/territories/:countryId", (req, res) => {
  const countryId = req.params.countryId;
  db.query("SELECT * FROM terrotory WHERE CountryID = ?", [countryId], (err, results) => {
    if (err) {
      console.error("Error fetching territories:", err);
      return res.status(500).json({ error: "Database error", details: err.message });
    }
    res.json(results);
  });
});

// Get districts by territory ID
app.get("/districts/:territoryId", (req, res) => {
  const territoryId = req.params.territoryId;
  db.query("SELECT * FROM district WHERE TerritoryID = ?", [territoryId], (err, results) => {
    if (err) {
      console.error("Error fetching districts:", err);
      return res.status(500).json({ error: "Database error", details: err.message });
    }
    res.json(results);
  });
});

// Get seats by district ID
app.get("/seats/:districtId", (req, res) => {
  const districtId = req.params.districtId;
  db.query("SELECT * FROM Seat WHERE DistricID = ?", [districtId], (err, results) => {
    if (err) {
      console.error("Error fetching seats:", err);
      return res.status(500).json({ error: "Database error", details: err.message });
    }
    res.json(results);
  });
});

// Add new citizen
app.post("/citizens", (req, res) => {
  const {
    CountryID, TerritoryID, DistrictID, SeatID, CitizenName, NIC, City, 
    Address1, Address2, DOB, Job, Salary, MaritalStatus, Auser, Muser, Terminal
  } = req.body;

  const sql = "INSERT INTO citizens (CountryID, TerritoryID, DistrictID, SeatID, CitizenName, NIC, City, Address1, Address2, DOB, Job, Salary, MaritalStatus, Auser, Muser, Terminal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

  db.query(sql, [
    CountryID, TerritoryID, DistrictID, SeatID, CitizenName, NIC, City, 
    Address1, Address2, DOB, Job, Salary, MaritalStatus, Auser, Muser, Terminal
  ], (err, result) => {
    if (err) {
      console.error("Error inserting citizen:", err);
      return res.status(500).json({ error: "Database error", details: err.message });
    }
    res.status(201).json({ message: "Citizen added successfully", id: result.insertId });
  });
});

// Add new country
app.post("/countries", (req, res) => {
  const { CountryID, CountryName, Auser, Muser, Terminal } = req.body;
  const sql = "INSERT INTO country(CountryID, CountryName, Auser, Muser, Terminal) VALUES(?, ?, ?, ?, ?)";
  
  db.query(sql, [CountryID, CountryName, Auser, Muser, Terminal], (err, result) => {
    if (err) {
      console.error("Error adding country:", err);
      return res.status(500).json({ error: "Database error", details: err.message });
    }
    res.status(201).json({ message: "Country added successfully", id: result.insertId });
  });
});

// Add new territory
app.post("/territories", (req, res) => {
  const { CountryID, TerritoryName, TerritoryShortName, Auser, Muser, Terminal } = req.body;
  const sql = "INSERT INTO terrotory(CountryID, TerritoryName, TerritoryShortName, Auser, Muser, Terminal) VALUES(?, ?, ?, ?, ?, ?)";
  
  db.query(sql, [CountryID, TerritoryName, TerritoryShortName, Auser, Muser, Terminal], (err, result) => {
    if (err) {
      console.error("Error adding territory:", err);
      return res.status(500).json({ error: "Database error", details: err.message });
    }
    res.status(201).json({ message: "Territory added successfully", id: result.insertId });
  });
});

// Add new district
app.post("/districts", (req, res) => {
  const { CountryID, TerritoryID, DistrictName, Auser, Muser, Terminal } = req.body;
  const sql = "INSERT INTO district (CountryID, TerritoryID, DistrictName, Auser, Muser, Terminal) VALUES(?, ?, ?, ?, ?, ?)";
  
  db.query(sql, [CountryID, TerritoryID, DistrictName, Auser, Muser, Terminal], (err, result) => {
    if (err) {
      console.error("Error adding district:", err);
      return res.status(500).json({ error: "Database error", details: err.message });
    }
    res.status(201).json({ message: "District added successfully", id: result.insertId });
  });
});

// Add new seat
app.post("/seats", (req, res) => {
  const { CountryID, TerritoryID, DistricID, SeatDescption, Auser, Muser, Terminal } = req.body;
  const sql = "INSERT INTO Seat(CountryID, TerritoryID, DistricID, SeatDescption, Auser, Muser, Terminal) VALUES(?, ?, ?, ?, ?, ?, ?)";
  
  db.query(sql, [CountryID, TerritoryID, DistricID, SeatDescption, Auser, Muser, Terminal], (err, result) => {
    if (err) {
      console.error("Error adding seat:", err);
      return res.status(500).json({ error: "Database error", details: err.message });
    }
    res.status(201).json({ message: "Seat added successfully", id: result.insertId });
  });
});

// Get citizens by district
app.get("/citizens/district/:districtId", (req, res) => {
  const districtId = req.params.districtId;
  db.query("SELECT * FROM citizens WHERE DistrictID = ?", [districtId], (err, results) => {
    if (err) {
      console.error("Error fetching citizens by district:", err);
      return res.status(500).json({ error: "Database error", details: err.message });
    }
    res.json(results);
  });
});

// Get citizens by seat
app.get("/citizens/seat/:seatId", (req, res) => {
  const seatId = req.params.seatId;
  db.query("SELECT * FROM citizens WHERE SeatID = ?", [seatId], (err, results) => {
    if (err) {
      console.error("Error fetching citizens by seat:", err);
      return res.status(500).json({ error: "Database error", details: err.message });
    }
    res.json(results);
  });
});

// Get all citizens
app.get("/citizens", (req, res) => {
  db.query("SELECT * FROM citizens", (err, results) => {
    if (err) {
      console.error("Error fetching all citizens:", err);
      return res.status(500).json({ error: "Database error", details: err.message });
    }
    res.json(results);
  });
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
  console.log(` Database: ${process.env.MYSQLDATABASE || "railway"}`);
  console.log(` Host: ${process.env.MYSQLHOST || "switchyard.proxy.rlwy.net"}`);
});