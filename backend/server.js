const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
const PORT = 3001;

// Your Blynk credentials
const BLYNK_AUTH_TOKEN = "rdimvmv9nfeHq6wtVv5VxdYTS52L5dG3";
const BLYNK_API_URL = "https://blynk.cloud/external/api";

// Enable CORS for React app
app.use(cors());
app.use(express.json());

// Helper function to fetch Blynk data
async function getBlynkData(pin) {
  try {
    const response = await axios.get(`${BLYNK_API_URL}/get`, {
      params: {
        token: BLYNK_AUTH_TOKEN,
        pin: pin
      },
      timeout: 5000
    });
    return response.data;
  } catch (error) {
    console.log(`Error fetching pin ${pin}:`, error.message);
    return null;
  }
}

// Main endpoint to get all sensor data
app.get('/api/status', async (req, res) => {
  try {
    console.log('Fetching Blynk data...');
    
    // Get data from Blynk Cloud
    const [doorbell, smoke, smokeValue] = await Promise.all([
      getBlynkData('V1'),
      getBlynkData('V0'),
      getBlynkData('V2')
    ]);

    // If Blynk returns an array, take the first value
    const doorbellValue = Array.isArray(doorbell) ? doorbell[0] : doorbell;
    const smokeValueData = Array.isArray(smokeValue) ? smokeValue[0] : smokeValue;
    const smokeState = Array.isArray(smoke) ? smoke[0] : smoke;

    const data = {
      doorbell: parseInt(doorbellValue) || 0,
      smoke: parseInt(smokeState) || 0,
      smokeValue: parseInt(smokeValueData) || 0,
      timestamp: new Date().toISOString(),
      connected: true
    };

    console.log('✅ Blynk Data received:', data);
    res.json(data);

  } catch (error) {
    console.log('❌ Blynk API Error, using demo data');
    
    // Return demo data if Blynk is offline
    const demoData = {
      doorbell: Math.random() > 0.9 ? 1 : 0, // 10% chance of doorbell
      smoke: Math.random() > 0.95 ? 1 : 0,   // 5% chance of smoke
      smokeValue: Math.floor(Math.random() * 500),
      timestamp: new Date().toISOString(),
      connected: false
    };
    
    res.json(demoData);
  }
});

// Test if Blynk connection works
app.get('/api/test-blynk', async (req, res) => {
  try {
    const test = await axios.get(`${BLYNK_API_URL}/get`, {
      params: {
        token: BLYNK_AUTH_TOKEN,
        pin: 'V1'
      }
    });
    
    res.json({ 
      success: true, 
      message: 'Blynk connection successful!',
      data: test.data,
      url: `${BLYNK_API_URL}/get?token=${BLYNK_AUTH_TOKEN}&pin=V1`
    });
  } catch (error) {
    res.json({ 
      success: false, 
      message: 'Blynk connection failed',
      error: error.message,
      url: `${BLYNK_API_URL}/get?token=${BLYNK_AUTH_TOKEN}&pin=V1`
    });
  }
});

// Simple test endpoints (for React demo controls)
app.post('/api/trigger/doorbell', async (req, res) => {
  try {
    await axios.get(`${BLYNK_API_URL}/update`, {
      params: {
        token: BLYNK_AUTH_TOKEN,
        pin: 'V1',
        value: 1
      }
    });
    
    // Auto-reset after 3 seconds
    setTimeout(async () => {
      await axios.get(`${BLYNK_API_URL}/update`, {
        params: {
          token: BLYNK_AUTH_TOKEN,
          pin: 'V1',
          value: 0
        }
      });
    }, 3000);
    
    res.json({ success: true, message: 'Doorbell triggered' });
  } catch (error) {
    res.json({ success: false, message: 'Failed to trigger doorbell' });
  }
});

app.post('/api/trigger/smoke', async (req, res) => {
  try {
    await axios.get(`${BLYNK_API_URL}/update`, {
      params: {
        token: BLYNK_AUTH_TOKEN,
        pin: 'V0',
        value: 1
      }
    });
    res.json({ success: true, message: 'Smoke alarm triggered' });
  } catch (error) {
    res.json({ success: false, message: 'Failed to trigger smoke alarm' });
  }
});

// Reset smoke sensor
app.post('/api/reset/smoke', async (req, res) => {
  try {
    await axios.get(`${BLYNK_API_URL}/update`, {
      params: {
        token: BLYNK_AUTH_TOKEN,
        pin: 'V0',
        value: 0
      }
    });
    res.json({ success: true, message: 'Smoke sensor reset' });
  } catch (error) {
    res.json({ success: false, message: 'Failed to reset' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'online',
    server: 'Blynk API Bridge',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Blynk API Server</title></head>
      <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h1>🚀 Blynk API Server Running</h1>
        <p>Your ESP32 data bridge is active!</p>
        <h3>Available Endpoints:</h3>
        <ul>
          <li><a href="/api/status">GET /api/status</a> - Get sensor data</li>
          <li><a href="/api/health">GET /api/health</a> - Health check</li>
          <li><a href="/api/test-blynk">GET /api/test-blynk</a> - Test Blynk connection</li>
        </ul>
        <p><strong>Token:</strong> ${BLYNK_AUTH_TOKEN}</p>
      </body>
    </html>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Blynk API Server running on http://localhost:${PORT}`);
  console.log(`📡 Blynk Token: ${BLYNK_AUTH_TOKEN}`);
  console.log('🌐 API Endpoints:');
  console.log(`   GET  http://localhost:${PORT}/api/status`);
  console.log(`   GET  http://localhost:${PORT}/api/health`);
  console.log(`   GET  http://localhost:${PORT}/api/test-blynk`);
  console.log(`   POST http://localhost:${PORT}/api/trigger/doorbell`);
  console.log(`   POST http://localhost:${PORT}/api/trigger/smoke`);
  console.log(`   POST http://localhost:${PORT}/api/reset/smoke`);
});