const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();

// Updated CORS configuration for deployment
app.use(cors({
  origin: [
    'http://localhost:3000',
    /\.railway\.app$/,  // Allow all Railway subdomains
    /\.vercel\.app$/,   // In case you deploy frontend elsewhere
    /\.netlify\.app$/   // In case you deploy frontend elsewhere
  ],
  credentials: true
}));

app.use(bodyParser.json());

// Database configuration
const db = mysql.createConnection({
  host: process.env.MYSQLHOST || "localhost",
  user: process.env.MYSQLUSER || "root",
  password: process.env.MYSQLPASSWORD || "",
  database: process.env.MYSQLDATABASE || "railway",
  port: process.env.MYSQLPORT || 3306
});

db.connect(err => {
  if (err) {
    console.error("Database connection failed:", err);
    return;
  }
  console.log("Connected to MySQL Database:", process.env.MYSQLDATABASE || "railway");
});

// Health check endpoint
app.get("/", (req, res) => {
  res.json({ 
    message: "Citizen Registry API is running!",
    status: "success",
    timestamp: new Date().toISOString(),
    database: process.env.MYSQLDATABASE || "railway"
  });
});

// Test database connection endpoint
app.get("/health", (req, res) => {
  db.query("SELECT 1", (err, results) => {
    if (err) {
      return res.status(500).json({ 
        status: "error", 
        message: "Database connection failed",
        error: err.message 
      });
    }
    res.json({ 
      status: "healthy", 
      database: "connected",
      timestamp: new Date().toISOString()
    });
  });
});

app.get("/countries", (req, res) => {
  db.query("SELECT * FROM country", (err, results) => {
    if (err) {
      console.error("Error fetching countries:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});

app.get("/territories/:countryId", (req, res) => {
  const countryId = req.params.countryId;
  db.query("SELECT * FROM terrotory WHERE CountryID = ?", [countryId], (err, results) => {
    if (err) {
      console.error("Error fetching territories:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});

app.get("/districts/:territoryId", (req, res) => {
  const territoryId = req.params.territoryId;
  db.query("SELECT * FROM district WHERE TerritoryID = ?", [territoryId], (err, results) => {
    if (err) {
      console.error("Error fetching districts:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});

app.get("/seats/:districtId", (req, res) => {
  const districtId = req.params.districtId;
  db.query("SELECT * FROM Seat WHERE DistricID = ?", [districtId], (err, results) => {
    if (err) {
      console.error("Error fetching seats:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});

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
      return res.status(500).json({ error: "Database error" });
    }
    res.status(201).json({ message: "Citizen added successfully", id: result.insertId });
  });
});

app.post("/countries", (req, res) => {
  const { CountryID, CountryName, Auser, Muser, Terminal } = req.body;
  const sql = "INSERT INTO country(CountryID, CountryName, Auser, Muser, Terminal) VALUES(?, ?, ?, ?, ?)";
  
  db.query(sql, [CountryID, CountryName, Auser, Muser, Terminal], (err, result) => {
    if (err) {
      console.error("Error adding country:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.status(201).json({ message: "Country added successfully", id: result.insertId });
  });
});

app.post("/territories", (req, res) => {
  const { CountryID, TerritoryName, TerritoryShortName, Auser, Muser, Terminal } = req.body;
  const sql = "INSERT INTO terrotory(CountryID, TerritoryName, TerritoryShortName, Auser, Muser, Terminal) VALUES(?, ?, ?, ?, ?, ?)";
  
  db.query(sql, [CountryID, TerritoryName, TerritoryShortName, Auser, Muser, Terminal], (err, result) => {
    if (err) {
      console.error("Error adding territory:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.status(201).json({ message: "Territory added successfully", id: result.insertId });
  });
});

app.post("/districts", (req, res) => {
  const { CountryID, TerritoryID, DistrictName, Auser, Muser, Terminal } = req.body;
  const sql = "INSERT INTO district (CountryID, TerritoryID, DistrictName, Auser, Muser, Terminal) VALUES(?, ?, ?, ?, ?, ?)";
  
  db.query(sql, [CountryID, TerritoryID, DistrictName, Auser, Muser, Terminal], (err, result) => {
    if (err) {
      console.error("Error adding district:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.status(201).json({ message: "District added successfully", id: result.insertId });
  });
});

app.post("/seats", (req, res) => {
  const { CountryID, TerritoryID, DistricID, SeatDescption, Auser, Muser, Terminal } = req.body;
  const sql = "INSERT INTO Seat(CountryID, TerritoryID, DistricID, SeatDescption, Auser, Muser, Terminal) VALUES(?, ?, ?, ?, ?, ?, ?)";
  
  db.query(sql, [CountryID, TerritoryID, DistricID, SeatDescption, Auser, Muser, Terminal], (err, result) => {
    if (err) {
      console.error("Error adding seat:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.status(201).json({ message: "Seat added successfully", id: result.insertId });
  });
});

app.get("/citizens/district/:districtId", (req, res) => {
  const districtId = req.params.districtId;
  db.query("SELECT * FROM citizens WHERE DistrictID = ?", [districtId], (err, results) => {
    if (err) {
      console.error("Error fetching citizens by district:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});

app.get("/citizens/seat/:seatId", (req, res) => {
  const seatId = req.params.seatId;
  db.query("SELECT * FROM citizens WHERE SeatID = ?", [seatId], (err, results) => {
    if (err) {
      console.error("Error fetching citizens by seat:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});