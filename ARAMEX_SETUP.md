# Aramex SOAP API Setup Guide

## ⚠️ IMPORTANT: Aramex Uses SOAP, Not REST

Aramex provides a **SOAP-based Web Service** for shipment tracking. This is different from REST APIs.

---

## Step 1: Get Your Aramex SOAP Credentials

### You Need These From Aramex:

1. **ARAMEX_USERNAME** - Your SOAP API username
2. **ARAMEX_PASSWORD** - Your SOAP API password  
3. **ARAMEX_ACCOUNT_NUMBER** - Your account number
4. **ARAMEX_ACCOUNT_PIN** - Account PIN (may be required)
5. **ARAMEX_ACCOUNT_ENTITY** - Usually country code (e.g., "TN" for Tunisia)
6. **ARAMEX_ACCOUNT_COUNTRY** - Your country code (e.g., "TN")

### Where to Find Them:

1. Log in to https://www.aramex.com/
2. Go to **My Account** → **API Settings** or **Integration**
3. Look for **SOAP API** section (NOT REST API)
4. Request access if not available
5. Copy the username and password
6. Note your account number and PIN

---

## Step 2: Test Your Credentials (Aramex Sample)

Aramex provides a test environment. You can test with:
- **Test Username**: `testuser`
- **Test Password**: `testpass`
- **Test Account**: `123456`

Test tracking number: `51331931571` (your current one should work too)

---

## Step 3: Update .env File

Open `.env` and fill in your credentials:

```env
ARAMEX_USERNAME=your_username_here
ARAMEX_PASSWORD=your_password_here
ARAMEX_ACCOUNT_NUMBER=123456789
ARAMEX_ACCOUNT_PIN=1234
ARAMEX_ACCOUNT_ENTITY=TN
ARAMEX_ACCOUNT_COUNTRY=TN
ARAMEX_VERSION=v1.0
```

**Example (DO NOT USE - just for reference):**
```env
ARAMEX_USERNAME=shop_infoone
ARAMEX_PASSWORD=Sec@rePass123
ARAMEX_ACCOUNT_NUMBER=999888777
ARAMEX_ACCOUNT_PIN=5678
ARAMEX_ACCOUNT_ENTITY=TN
ARAMEX_ACCOUNT_COUNTRY=TN
ARAMEX_VERSION=v1.0
```

---

## Step 4: Restart Backend

```bash
npm run dev
```

You should see in the terminal:
```
Server running on http://localhost:5000
```

---

## Step 5: Test Tracking Number 51331931571

1. Open your app: http://localhost:3000
2. Go to **Commandes Client** (Orders)
3. Find command **CC420724**
4. Click the **Tracking Icon** (truck)
5. Select **ARAMEX** transporter
6. Enter tracking number: **51331931571**
7. Click **Submit**
8. Click **Sync Tracking** button
9. Check if status changes to **DELIVERED** ✅

---

## Expected Results

### If Credentials are Correct:
- Status updates to **DELIVERED**
- Shows delivery date and location
- No errors in terminal

### If Credentials are Wrong:
- Error message in terminal: `SOAP Fault - Invalid credentials`
- Status stays **PENDING**

---

## Common Issues

| Problem | Solution |
|---|---|
| "Credentials not configured" | Add all ARAMEX_* values to .env |
| SOAP Fault - Authentication failed | Check username/password are correct (SOAP, not API key) |
| Cannot reach SOAP endpoint | Check internet, firewall rules |
| Status not updating | Click "Sync Tracking" button, not just submit |

---

## SOAP Endpoint Details

```
Service URL: http://ws.aramex.net/shippingapi/tracking/service_1_0.svc
WSDL: http://ws.aramex.net/shippingapi/tracking/service_1_0.svc?wsdl
Operation: TrackShipments
```

The system automatically sends SOAP XML requests to this endpoint.

---

## Next Steps

Once credentials are working:
1. ✅ Confirm tracking number 51331931571 shows as DELIVERED
2. ✅ Test with other orders
3. ✅ Set up automatic tracking checks (every 30 minutes)
4. ✅ Enable SMS notifications when delivered

---

**Need Help?**
- Check terminal output for error messages
- See `API_INTEGRATION_GUIDE.md` for detailed troubleshooting
- Contact Aramex support for SOAP API credentials
