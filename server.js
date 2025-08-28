const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Database connection with retry logic for Railway
let db;
let connectionAttempts = 0;
const maxAttempts = 5;

function connectWithRetry() {
  connectionAttempts++;
  
  const dbConfig = {
    host: process.env.MYSQLHOST || "switchyard.proxy.rlwy.net",
    user: process.env.MYSQLUSER || "root",
    password: process.env.MYSQLPASSWORD || "aHZgLzUEMhBowANJSnpTahXgYawkVLbL",
    port: process.env.MYSQLPORT || 13701,
    database: process.env.MYSQLDATABASE || "railway",
    connectTimeout: 60000,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true
  };

  console.log(`Connection attempt ${connectionAttempts}`);
  console.log(`Database: ${dbConfig.database}`);
  console.log(`Host: ${dbConfig.host}`);

  db = mysql.createConnection(dbConfig);

  db.connect(err => {
    if (err) {
      console.error(`❌ Connection attempt ${connectionAttempts} failed:`, err.message);
      
      if (connectionAttempts < maxAttempts) {
        console.log('Retrying in 3 seconds...');
        setTimeout(connectWithRetry, 3000);
      } else {
        console.error('All connection attempts failed. Please check your database configuration.');
        console.log('Current environment variables:', {
          MYSQLHOST: process.env.MYSQLHOST,
          MYSQLUSER: process.env.MYSQLUSER,
          MYSQLDATABASE: process.env.MYSQLDATABASE,
          MYSQLPORT: process.env.MYSQLPORT
        });
        process.exit(1);
      }
      return;
    }
    
    console.log(`✅ Connected to MySQL Database: ${dbConfig.database}`);
    connectionAttempts = 0; // Reset on successful connection
  });

  // Handle connection errors after initial connection
  db.on('error', (err) => {
    console.error('Database connection error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.log('Attempting to reconnect...');
      connectWithRetry();
    }
  });
}

// Initial connection
connectWithRetry();

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
  db.query("SELECT * FROM seat WHERE DistricID = ?", [districtId], (err, results) => {
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
  const sql = "INSERT INTO seat(CountryID, TerritoryID, DistricID, SeatDescption, Auser, Muser, Terminal) VALUES(?, ?, ?, ?, ?, ?, ?)";
  
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

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});