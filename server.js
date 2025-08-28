const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const cors = require("cors");
const dns = require("dns");

const app = express();

// CORS configuration
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

// Function to test DNS resolution
async function testDnsResolution(hostname) {
  return new Promise((resolve) => {
    dns.lookup(hostname, (err, address) => {
      if (err) {
        console.log(`❌ DNS resolution failed for ${hostname}: ${err.message}`);
        resolve(false);
      } else {
        console.log(`✅ DNS resolution successful for ${hostname} -> ${address}`);
        resolve(true);
      }
    });
  });
}

// Database configuration with multiple host fallbacks
const getDbConfig = () => {
  const hostsToTry = [
    process.env.EXTERNAL_MYSQLHOST,
    'switchyard.proxy.rlwy.net', // From your earlier logs
    process.env.MYSQLHOST,
    'mysql.railway.internal',
    'localhost'
  ].filter(Boolean); // Remove any undefined/null values

  return {
    host: hostsToTry[0], // Will be updated during connection test
    user: process.env.MYSQLUSER || "root",
    password: process.env.MYSQLPASSWORD || "",
    database: process.env.MYSQLDATABASE || "railway",
    port: process.env.MYSQLPORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    connectTimeout: 60000,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true
  };
};

// Create connection pool
let pool = mysql.createPool(getDbConfig());
let promisePool = pool.promise();

// Enhanced connection test with multiple hostname fallbacks
async function testConnection(retries = 5, delay = 3000) {
  const hostsToTry = [
    process.env.EXTERNAL_MYSQLHOST,
    'switchyard.proxy.rlwy.net',
    process.env.MYSQLHOST,
    'mysql.railway.internal',
    'localhost'
  ].filter(Boolean);

  console.log('Testing connection with hosts:', hostsToTry);

  for (let i = 0; i < retries; i++) {
    for (const host of hostsToTry) {
      try {
        console.log(`Attempt ${i + 1}: Trying to connect to ${host}...`);
        
        // Test DNS resolution first
        const dnsWorking = await testDnsResolution(host);
        if (!dnsWorking) {
          console.log(`Skipping ${host} due to DNS issues`);
          continue;
        }
        
        // Create a temporary connection to test this host
        const tempConfig = { ...getDbConfig(), host };
        const tempPool = mysql.createPool(tempConfig);
        const tempPromisePool = tempPool.promise();
        
        const connection = await tempPromisePool.getConnection();
        console.log(`✅ Connected to MySQL at ${host} successfully!`);
        
        // Test a query
        const [results] = await connection.query("SELECT VERSION() as version, DATABASE() as db");
        console.log("MySQL Version:", results[0].version);
        console.log("Current Database:", results[0].db);
        
        connection.release();
        tempPool.end();
        
        // Update the main pool to use this successful host
        pool.end(() => {
          console.log('Closed previous connection pool');
        });
        
        pool = mysql.createPool({ ...getDbConfig(), host });
        promisePool = pool.promise();
        
        console.log(`🎉 Successfully connected to database using host: ${host}`);
        return true;
      } catch (err) {
        console.error(`❌ Connection to ${host} failed:`, err.message);
        // Continue to next host
      }
    }
    
    if (i === retries - 1) {
      console.error("All connection attempts failed. Please check your database configuration.");
      console.log("Current environment variables:", {
        MYSQLHOST: process.env.MYSQLHOST,
        EXTERNAL_MYSQLHOST: process.env.EXTERNAL_MYSQLHOST,
        MYSQLUSER: process.env.MYSQLUSER,
        MYSQLDATABASE: process.env.MYSQLDATABASE,
        MYSQLPORT: process.env.MYSQLPORT,
        hasPassword: !!process.env.MYSQLPASSWORD
      });
      return false;
    }
    
    console.log(`Retrying in ${delay/1000} seconds... (Attempt ${i + 1}/${retries})`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

// Test connection on startup with more retries
testConnection(8, 4000);

// Health check endpoint
app.get("/", (req, res) => {
  res.json({ 
    message: "Citizen Registry API is running!",
    status: "success",
    timestamp: new Date().toISOString(),
    database: process.env.MYSQLDATABASE,
    host: pool.config.connectionConfig.host
  });
});

// Database health check
app.get("/health", async (req, res) => {
  try {
    const [results] = await promisePool.query("SELECT 1 as test");
    res.json({ 
      status: "healthy", 
      database: "connected",
      timestamp: new Date().toISOString(),
      host: pool.config.connectionConfig.host
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

// Debug endpoint to check connection details
app.get("/debug", (req, res) => {
  res.json({
    currentHost: pool.config.connectionConfig.host,
    MYSQLHOST: process.env.MYSQLHOST,
    EXTERNAL_MYSQLHOST: process.env.EXTERNAL_MYSQLHOST,
    MYSQLUSER: process.env.MYSQLUSER,
    MYSQLDATABASE: process.env.MYSQLDATABASE,
    MYSQLPORT: process.env.MYSQLPORT,
    hasPassword: !!process.env.MYSQLPASSWORD,
    nodeEnv: process.env.NODE_ENV
  });
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

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Database: ${process.env.MYSQLDATABASE || 'Not specified'}`);
  console.log(`🌐 Current host: ${pool.config.connectionConfig.host}`);
  console.log(`👤 Database user: ${process.env.MYSQLUSER || 'Not specified'}`);
});