# Monitoring & Alerting Guide

This guide describes the observability architecture for TaskFlow, including Render's built-in deployment health checks, uptime monitoring with **UptimeRobot**, and dependency readiness diagnostics.

---

## 1. Health Probe Architecture

TaskFlow provides two specialized health check endpoints:

### Liveness Probe: `GET /api/v1/health`

- **Purpose**: Rapid process check verifying that the Node/Express event loop is responsive and accepting network connections.
- **Payload**: `{"status": "ok"}`
- **Latency**: < 2 ms.
- **Used by**: Render deployment gatekeeper and primary external uptime monitors.

### Readiness Probe: `GET /api/v1/ready`

- **Purpose**: Deep dependency validation verifying active connectivity to **PostgreSQL** (`SELECT 1`) and **Upstash Redis** (`PING`).
- **Success Payload (200 OK)**:
  ```json
  {
    "status": "ready",
    "dependencies": {
      "postgres": "up",
      "redis": "up"
    }
  }
  ```
- **Failure Payload (503 Service Unavailable)**:
  ```json
  {
    "error": {
      "code": "SERVICE_UNAVAILABLE",
      "message": "Required dependencies are unavailable",
      "details": []
    }
  }
  ```
- **Used by**: Diagnostic synthetic checks and database health monitors.

---

## 2. Render Built-In Zero-Downtime Health Checks

When `healthCheckPath: /api/v1/health` is configured in [render.yaml](file:///f:/grok/project%201/render.yaml):

1. **Deployment Gating**: When a new version is built, Render starts the new container and polls `/api/v1/health`.
2. **Zero-Downtime Cutover**: Only when `/api/v1/health` returns HTTP 200 does Render redirect incoming edge traffic to the new instance. The old instance is gracefully drained and terminated.
3. **Automatic Rollback on Startup Failure**: If the new container fails to respond with HTTP 200 within the deployment timeout window, Render cancels the deployment and leaves the previous healthy build active.
4. **Crash Notifications**: Render automatically sends an alert email to the account owner whenever a service crashes or exits unexpectedly.

---

## 3. Free External Uptime Monitoring (UptimeRobot)

Render free-tier services do not include external synthetic uptime polling. We configure **UptimeRobot** (which provides 50 free monitors with 5-minute intervals) for live monitoring and keep-alive pinging.

### Step-by-Step Setup:

1. Navigate to [uptimerobot.com](https://uptimerobot.com) and click **Sign Up Free**.
2. Once logged into the dashboard, click **+ Add New Monitor**.
3. Fill in the monitor settings:
   - **Monitor Type**: `HTTP(s)`
   - **Friendly Name**: `TaskFlow API - Production`
   - **URL (or IP)**: `https://<your-taskflow-api-slug>.onrender.com/api/v1/health`
   - **Monitoring Interval**: `5 minutes`
   - **Monitor Timeout**: `30 seconds`
4. Under **Select "Alert Contacts To Notify"**, check your email address.
5. Click **Create Monitor**.

### Dual Benefit: Keep-Alive Prevention

- Render free Web Services spin down after **15 minutes** of inactivity.
- By configuring UptimeRobot with a **5-minute monitoring interval**, the periodic HTTP request resets Render's 15-minute inactivity timer.
- **Result**: The API stays warm, eliminating the 30–60s cold-start latency for users visiting the site during active monitoring periods.

---

## 4. Alerting & Incident Response

### What Triggers an Alert:

1. **HTTP Status Code Mismatch**: Any HTTP response code other than `200 OK` (e.g. `500`, `502`, `503`, `504`).
2. **Connection Timeout**: The server fails to respond within 30 seconds (indicates severe resource exhaustion or infinite loop).
3. **DNS / SSL Resolution Error**: Domain name resolution failure or expired SSL/TLS certificate.

### Alert Flow:

```text
[ TaskFlow API ] ──(HTTP Error / Timeout)──> [ UptimeRobot ]
                                                     │
                                       (After 2 Failed Checks)
                                                     │
                                                     ▼
                                     [ Email Notification / Webhook ]
                                                     │
                                   "Monitor is DOWN: TaskFlow API"
```

### Incident Action Plan:

1. Check Render service dashboard: view live deploy logs and container metrics.
2. Hit `https://<api-slug>.onrender.com/api/v1/ready` in a browser to pinpoint if the failure is in PostgreSQL or Redis.
3. Check Supabase Dashboard status (confirm database is active and not paused).
4. Check Upstash Console status (confirm Redis quota is not exceeded).
5. Trigger rollback in Render if the incident was precipitated by a recent deploy (see [Rollback Guide](file:///f:/grok/project%201/docs/rollback.md)).
