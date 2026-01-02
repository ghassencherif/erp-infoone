# Order Tracking API Integration Guide

## Overview
This guide explains how to integrate Aramex and First Delivery tracking APIs with the ERP system for real-time order status updates.

---

## Aramex API Integration

### API Type
**SOAP-based Web Service** (not REST)

### WSDL & Endpoint
```
WSDL: http://ws.aramex.net/shippingapi/tracking/service_1_0.svc?wsdl
Endpoint: http://ws.aramex.net/shippingapi/tracking/service_1_0.svc
Operation: TrackShipments
```

### Authentication
- **Type**: Username + Password (Basic Auth)
- **Additional Fields**:  - `AccountNumber`: Your Aramex account number
  - `AccountPin`: May be required (check with Aramex)
  - `AccountEntity`: Usually your country code (e.g., "TN" for Tunisia)
  - `AccountCountryCode`: Your country code
  - `Version`: API version (typically "v1.0")

### Request Format (SOAP XML)
```xml
<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" 
               xmlns:tns="http://ws.aramex.net/ShippingAPI/v1/">
  <soap:Body>
    <tns:TrackShipments>
      <tns:ClientInfo>
        <tns:UserName>your_username</tns:UserName>
        <tns:Password>your_password</tns:Password>
        <tns:Version>v1.0</tns:Version>
        <tns:AccountNumber>your_account_number</tns:AccountNumber>
        <tns:AccountPin>your_pin</tns:AccountPin>
        <tns:AccountEntity>TN</tns:AccountEntity>
        <tns:AccountCountryCode>TN</tns:AccountCountryCode>
      </tns:ClientInfo>
      <tns:Transaction>
        <tns:Reference1>ref1</tns:Reference1>
      </tns:Transaction>
      <tns:Shipments>
        <string xmlns="http://schemas.microsoft.com/2003/10/Serialization/Arrays">51331931571</string>
      </tns:Shipments>
      <tns:GetLastTrackingUpdateOnly>true</tns:GetLastTrackingUpdateOnly>
    </tns:TrackShipments>
  </soap:Body>
</soap:Envelope>
```

### Response Format (SOAP XML)
```xml
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Body>
    <TrackShipmentsResponse xmlns="http://ws.aramex.net/ShippingAPI/v1/">
      <TrackShipmentsResult>
        <Notifications>
          <!-- If any errors occur -->
        </Notifications>
        <HasErrors>false</HasErrors>
        <TrackingResults>
          <KeyValueOfstringArrayOfTrackingResultmFAkxlpY>
            <Key>51331931571</Key>
            <Value>
              <TrackingResult>
                <WaybillNumber>51331931571</WaybillNumber>
                <UpdateCode>DLV</UpdateCode>
                <UpdateDescription>Delivered</UpdateDescription>
                <UpdateDateTime>2025-12-29T14:30:00</UpdateDateTime>
                <UpdateLocation>Tunis, TN</UpdateLocation>
                <Comments>Package delivered to recipient</Comments>
                <ProblemCode></ProblemCode>
              </TrackingResult>
            </Value>
          </KeyValueOfstringArrayOfTrackingResultmFAkxlpY>
        </TrackingResults>
      </TrackShipmentsResult>
    </TrackShipmentsResponse>
  </s:Body>
</s:Envelope>
```

### Status Code Mapping
| Aramex Code | Meaning | ERP DeliveryStatus |
|---|---|---|
| DLV | Delivered | `DELIVERED` |
| DEL | Delivered | `DELIVERED` |
| PIU | Picked Up | `PICKED_UP` |
| OFD | Out For Delivery | `OUT_FOR_DELIVERY` |
| ITR | In Transit | `IN_TRANSIT` |
| PUP | Pick Up | `PICKED_UP` |
| FAD | Failed Delivery | `FAILED` |
| RTN | Returned | `FAILED` |
| CXL | Cancelled | `CANCELLED` |

### Setup Instructions

1. **Get SOAP Credentials**:
   - Log in to [Aramex Shipper Portal](https://www.aramex.com/)
   - Navigate to **API Settings** or **Integration**
   - Request **SOAP API access** (not REST)
   - Get these values:
     - Username (for SOAP)
     - Password (for SOAP)
     - Account Number
     - Account PIN (if required)
     - Account Entity (country code)

2. **Update .env**:
   ```env
   ARAMEX_USERNAME=your_username_here
   ARAMEX_PASSWORD=your_password_here
   ARAMEX_ACCOUNT_NUMBER=123456789
   ARAMEX_ACCOUNT_PIN=1234
   ARAMEX_ACCOUNT_ENTITY=TN
   ARAMEX_ACCOUNT_COUNTRY=TN
   ARAMEX_VERSION=v1.0
   ```

3. **Restart Backend**:
   ```bash
   npm run dev
   ```

4. **Test with Your Tracking Number**:
   - Go to Order Tracking in the app
   - Select ARAMEX transporter
   - Enter tracking number: `51331931571`
   - Click "Sync Tracking"
   - Check if it shows "DELIVERED"

### Troubleshooting

| Error | Cause | Solution |
|---|---|---|
| "Credentials not configured" | Missing .env vars | Add ARAMEX_USERNAME, ARAMEX_PASSWORD, ARAMEX_ACCOUNT_NUMBER to .env |
| SOAP Fault - Invalid credentials | Wrong username/password | Verify SOAP credentials (not API key) in Aramex portal |
| SOAP Fault - Account not authorized | Account PIN missing/wrong | Get correct PIN from Aramex, add to ARAMEX_ACCOUNT_PIN |
| Cannot reach SOAP endpoint | Network issue | Check internet connection, Aramex firewall rules |
| 500 error from Aramex | API version mismatch | Verify ARAMEX_VERSION matches what Aramex provides |
| XML parsing error | Response format | Check Aramex SOAP response structure |

### Example Success Response
When tracking is found and delivered:
```json
{
  "status": "DELIVERED",
  "notes": "Delivered - Package delivered to recipient",
  "deliveryDate": "2025-12-29T14:30:00Z",
  "isDelivered": true,
  "location": "Tunis, TN"
}
```

---

## First Delivery API Integration

### API Endpoint
```
POST https://www.firstdeliverygroup.com/api/v2/etat
```

### Authentication
- **Type**: Bearer Token
- **Header**: `Authorization: Bearer {FIRST_DELIVERY_API_KEY}`
- **Credentials Required**:
  - `FIRST_DELIVERY_API_KEY`: Your access token from First Delivery dashboard

### Request Body
```json
{
  "barCode": "tracking_number"
}
```

### Response Format
```json
{
  "id": "123456",
  "barCode": "tracking_number",
  "state": 2,
  "comment": "Order delivered",
  "createdAt": "2025-12-27T10:00:00Z",
  "updatedAt": "2025-12-29T15:30:00Z"
}
```

### Status Mapping (State Codes)
| Code | State | ERP DeliveryStatus |
|---|---|---|
| 0 | En attente | `PENDING` |
| 1 | En cours | `IN_TRANSIT` |
| 2 | Livré | `DELIVERED` |
| 3 | Echange | `IN_TRANSIT` |
| 5 | Retour Expéditeur | `FAILED` |
| 6 | Supprimé | `CANCELLED` |
| 100 | Demande d'enlèvement | `PENDING` |
| 101 | Demande assignée | `IN_TRANSIT` |
| 102 | En cours d'enlèvement | `IN_TRANSIT` |
| 103 | Enlevé | `PICKED_UP` |

### Setup Instructions
1. **Get Credentials**:
   - Log in to [First Delivery Dashboard](https://www.firstdeliverygroup.com/)
   - Navigate to API Settings or Integration
   - Generate API Token/Key
   - Copy the Bearer token

2. **Update .env**:
   ```env
   FIRST_DELIVERY_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   FIRST_DELIVERY_API_URL=https://www.firstdeliverygroup.com/api/v2
   ```

3. **Rate Limiting** ⚠️:
   - **Query status**: 1 request per second (per rule)
   - **Bulk create orders**: 1 request per 10 seconds
   - Exceeding limits returns HTTP 429 (Too Many Requests)
   - **Solution**: Implement queue/batch system for status checks (see below)

4. **Test**:
   ```bash
   curl -X POST https://www.firstdeliverygroup.com/api/v2/etat \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"barCode": "TEST_BARCODE"}'
   ```

### Rate Limit Handling
If you have multiple orders to track, implement a queue:

```typescript
// Example: Check 10 orders with 1-second delays
async function checkAllOrdersWithRateLimit() {
  const orders = await getInTransitOrders();
  
  for (const order of orders) {
    await checkFirstDeliveryTracking(order.trackingNumber);
    await new Promise(r => setTimeout(r, 1100)); // 1.1s delay to be safe
  }
}
```

### Troubleshooting
| Error | Cause | Solution |
|---|---|---|
| 401 Unauthorized | Invalid token | Verify `FIRST_DELIVERY_API_KEY` is complete and correct |
| 403 Forbidden | Token expired | Regenerate new token in dashboard |
| 404 Not Found | barCode doesn't exist | Verify tracking number is correct format |
| 429 Too Many Requests | Rate limit exceeded | Wait 1+ second before next request |
| Timeout (>15s) | API overloaded | Retry with exponential backoff |

---

## Integration in Backend

### Route: POST /api/tracking/commandes-client/:id/start
Starts delivery tracking for an order.

**Request**:
```json
{
  "transporter": "ARAMEX|FIRST_DELIVERY|OUR_COMPANY",
  "trackingNumber": "123456789",
  "deliveryNote": "Optional delivery instructions"
}
```

**Response**:
```json
{
  "message": "Commande passée en livraison",
  "commande": {
    "id": 1,
    "numero": "CMD-001",
    "transporter": "ARAMEX",
    "trackingNumber": "123456789",
    "deliveryStatus": "PENDING",
    "lastTrackingCheck": "2025-12-29T10:30:00Z"
  }
}
```

### Route: POST /api/tracking/commandes-client/:id/check
Manually trigger a tracking status check.

**Response**:
```json
{
  "id": 1,
  "deliveryStatus": "IN_TRANSIT",
  "deliveryDate": null,
  "lastTrackingCheck": "2025-12-29T15:45:00Z"
}
```

### Automatic Status Updates
The system checks tracking status on:
1. **Manual trigger**: User clicks "Sync" button in dashboard
2. **Initial check**: When transporter is selected
3. **Scheduled job** (Optional): Can set up cron job to check all in-transit orders every 30 minutes

---

## Setting Up Scheduled Tracking (Optional)

### Using PM2 (Recommended for Production)

1. Create scheduler file `jobs/tracking-scheduler.ts`:
```typescript
import { checkAllTrackingStatuses } from '../routes/order-tracking';

async function run() {
  console.log(`[${new Date().toISOString()}] Checking all tracking statuses...`);
  await checkAllTrackingStatuses();
}

run();
```

2. Add to `package.json`:
```json
{
  "scripts": {
    "track:check": "ts-node jobs/tracking-scheduler.ts"
  }
}
```

3. Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: 'tracking-job',
      script: './jobs/tracking-scheduler.ts',
      instances: 1,
      exec_mode: 'fork',
      cron_restart: '*/30 * * * *' // Every 30 minutes
    }
  ]
};
```

4. Start job:
```bash
pm2 start ecosystem.config.js --only tracking-job
pm2 save
```

### Using Windows Task Scheduler

1. Create `.bat` file `run-tracking.bat`:
```batch
@echo off
cd C:\Users\DELL-IT\Desktop\ERP Infoone\Infoone
npm run track:check
```

2. Open Task Scheduler:
   - Press `Win+R`, type `taskschd.msc`
   - Create Basic Task
   - Name: "ERP Tracking Job"
   - Trigger: Daily, every 30 minutes
   - Action: Start program → `run-tracking.bat`

---

## Monitoring & Logging

All API calls are logged to console:

```
❌ Aramex tracking error: 401 - Invalid API key
❌ First Delivery tracking error: 429 - Rate limited
⚠️ Rate limited: First Delivery allows 1 req/sec per rule
```

### Check Logs
- **Frontend**: Browser console (F12)
- **Backend**: Terminal where `npm run dev` is running
- **Database**: Query `DeliveryEvent` table for history

```sql
SELECT * FROM `DeliveryEvent` 
WHERE commandeId = 1 
ORDER BY createdAt DESC;
```

---

## SMS Notifications (Optional)

### Twilio Setup
1. Sign up at [Twilio.com](https://www.twilio.com/)
2. Get credentials:
   - Account SID
   - Auth Token
   - Twilio phone number (from)

3. Update .env:
```env
SMS_ENABLED=true
TWILIO_ACCOUNT_SID=ACxxx...
TWILIO_AUTH_TOKEN=token...
TWILIO_FROM=+1234567890
```

4. SMS templates (auto-sent when delivered):
   - **EN**: "Your order {numero} has been delivered. Thank you!"
   - **FR**: "Votre commande {numero} a été livrée. Merci pour votre confiance."

---

## Testing Checklist

- [ ] `.env` file has all credentials filled in
- [ ] Backend running: `npm run dev`
- [ ] Test Aramex API with curl (see above)
- [ ] Test First Delivery API with curl (see above)
- [ ] Create a test order in the system
- [ ] Click "Track Order" and select transporter
- [ ] Enter test tracking number
- [ ] Click "Sync Tracking" - should show status update
- [ ] Check `/commandes-client/tracking` dashboard
- [ ] Verify events logged in `DeliveryEvent` table

---

## Support

### Common Issues & Solutions

**Q: "No update" when checking tracking**
- A: API returned successful response but with no new status. This is normal.

**Q: Tracking stuck on "PENDING"**
- A: Status not updated in API yet (usually takes 1-2 hours). Try again later.

**Q: "Credentials not configured" warning**
- A: Add missing keys to `.env` and restart backend: `npm run dev`

**Q: Getting 404 on Aramex**
- A: Wrong endpoint URL. Contact Aramex support for your regional API URL.

**Q: First Delivery 429 errors**
- A: Too many requests. Add delays between API calls (>1 second).

**Q: SMS not sending**
- A: Set `SMS_ENABLED=true` and verify Twilio credentials in `.env`

---

## Files Updated

- `server/routes/order-tracking.ts` - API integration functions
- `.env` - Credentials configuration
- `prisma/schema.prisma` - DeliveryEvent model (already applied)
- `src/pages/TrackingDashboard.tsx` - UI for monitoring

---

*Last Updated: 2025-12-29*
