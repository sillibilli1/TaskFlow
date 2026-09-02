# Incident Postmortem: INC-20260903-01

## Incident Summary

- **Incident Title**: Transient UptimeRobot "Connection Timeout" Alert During Production Auto-Deploy
- **Date & Time**: 2026-09-03 03:58:13 UTC
- **Duration**: ~45 seconds
- **Severity**: SEV-3 (Transient Latency Degradation / Alert Notification)
- **Impacted Service**: `taskflow-api-u96m.onrender.com` (Production API)
- **Lead Responder**: SRE / Platform Engineer

---

## 1. Executive Summary & Impact

At 03:58 UTC, an automated email notification was dispatched by **UptimeRobot** reporting that the production endpoint `https://taskflow-api-u96m.onrender.com/api/v1/health` had failed with a **"Connection Timeout"**.

Immediate investigation confirmed that **zero data loss occurred and no actual service crash took place**. The synthetic probe timeout was caused by CPU saturation on Render's shared free-tier container during an automatic deployment triggered by git commit `4abcf12`. The incoming probe arrived while the single shared CPU core was compiling TypeScript (`tsc`), causing the response to exceed UptimeRobot's 30-second timeout window. The service self-recovered within 45 seconds once the deployment cutover completed.

---

## 2. Timeline of Events

| Timestamp (UTC) | Event Description                                                                                                                                                                    |
| :-------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **03:58:13**    | Commit `4abcf12` pushed to `main` (adding live staging documentation to README).                                                                                                     |
| **03:58:15**    | Render webhook detects push to `main` and initiates automatic build of `taskflow-api`.                                                                                               |
| **03:58:20**    | Render container executes `npm install` and `tsc -p tsconfig.json`. CPU utilization on the shared 0.1 vCPU / 512MB free instance spikes to 100%.                                     |
| **03:58:35**    | UptimeRobot dispatches scheduled 5-minute HTTP `GET /api/v1/health` synthetic check.                                                                                                 |
| **03:59:05**    | UptimeRobot probe reaches its 30-second timeout limit before the CPU-saturated instance returns the HTTP response. UptimeRobot records a "Down" state and dispatches an alert email. |
| **03:59:15**    | Render finishes container compilation (`duration: 45.4s`), passes internal health checks, and cuts edge routing over to the new container.                                           |
| **03:59:20**    | SRE team probes `/api/v1/health` and `/api/v1/ready` directly; both respond immediately with HTTP 200 OK (`status: "ok"`, `postgres: "up"`, `redis: "up"`).                          |
| **04:00:00**    | Subsequent UptimeRobot probe succeeds with < 200ms latency. Service status restored to 🟢 **100% Up**.                                                                               |

---

## 3. Root Cause Analysis (The 5 Whys)

1. **Why did UptimeRobot fire a "Connection Timeout" alert?**
   The HTTP `GET /api/v1/health` probe did not receive a response within UptimeRobot's 30-second timeout window.
2. **Why did the response take longer than 30 seconds?**
   The Node.js event loop and operating system scheduler were starved of CPU cycles, delaying TCP socket processing.
3. **Why was the CPU starved?**
   Render was compiling the production API container (`npm install` and `tsc`) directly on the shared free-tier instance while the existing container was actively serving traffic.
4. **Why did Render compile the container at that exact moment?**
   Commit `4abcf12` was pushed directly to `main`, which triggered Render's automated deployment hook (`autoDeploy: true`).
5. **Why did this degrade serving traffic?**
   Render's free tier provides shared burstable compute (0.1 vCPU, 512MB RAM) where build-time compilation and run-time traffic share the same compute boundary. (On paid tiers, builds execute in isolated builder environments).

---

## 4. Detection & Response

- **Detection**: Detected automatically via UptimeRobot external synthetic monitoring within 1 minute.
- **Verification**: Direct automated probes executed against:
  - `https://taskflow-api-u96m.onrender.com/api/v1/health` → returned `{"status": "ok"}`
  - `https://taskflow-api-u96m.onrender.com/api/v1/ready` → returned `{"status": "ready", "dependencies": {"postgres": "up", "redis": "up"}}`
- **Isolation Check**: Verified that all concurrent load-testing activities were operating strictly on `taskflow-api-staging-3lou.onrender.com` and did not contaminate the production environment.

---

## 5. Preventative Action Items

| Action Item                                                                                                                                                                                             | Priority | Status      | Owner       |
| :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :------- | :---------- | :---------- |
| **Strict Staging Testing**: Continue executing all synthetic load tests and chaos tests exclusively on Staging.                                                                                         | P0       | Implemented | SRE Team    |
| **Alert Threshold Tuning**: Configure UptimeRobot to require **2 consecutive failed pings** before dispatching an alert, filtering out transient 30-second deploy cutover blips.                        | P1       | Planned     | DevOps      |
| **Zero-Downtime Health Check Path**: Ensure `healthCheckPath: /api/v1/health` is enforced in [`render.yaml`](file:///f:/grok/project%201/render.yaml) so traffic is held until container boot finishes. | P1       | Verified    | Platform    |
| **Paid Tier Roadmap**: For commercial deployment, migrate to Render Starter ($7/mo) where container builds execute on dedicated isolated build instances separate from running services.                | P2       | Documented  | Engineering |
