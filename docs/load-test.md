# TaskFlow Load Test & Benchmark Results

This document records the results of synthetic load and stress tests executed against TaskFlow's cloud infrastructure using **Autocannon**.

> [!IMPORTANT]
> **Test Environment Isolation: Staging Used**:
> In accordance with zero-disruption SRE practices, all benchmarks in this report were executed strictly against the **Staging Environment** ([`https://taskflow-api-staging-3lou.onrender.com`](https://taskflow-api-staging-3lou.onrender.com)).
> This prevented artificial latency spikes, rate-limit starvation, or service degradation for real users visiting the production demonstration.

---

## 1. Test Matrix & Scenarios

| Scenario                           | Target Endpoint           | Description                                                   | Concurrency    | Duration          |
| :--------------------------------- | :------------------------ | :------------------------------------------------------------ | :------------- | :---------------- |
| **1. Liveness & Event Loop**       | `GET /api/v1/health`      | Process throughput without database calls                     | 10 connections | 10 seconds        |
| **2. Deep Dependency Diagnostics** | `GET /api/v1/ready`       | Live cross-cloud queries (`Postgres SELECT 1` + `Redis PING`) | 5 connections  | 10 seconds        |
| **3. Mutation Rate Limiter**       | `POST /api/v1/auth/login` | Sliding-window mutation throttle (60 req/min limit)           | 5 connections  | 75 requests burst |

---

## 2. Benchmark 1: Liveness Throughput (`GET /api/v1/health`)

Tests the baseline capacity of the NestJS event loop and Render edge proxy when zero external database I/O is required.

### Raw Autocannon Output:

```text
Running 10s test @ https://taskflow-api-staging-3lou.onrender.com/api/v1/health
10 connections

┌─────────┬────────┬────────┬────────┬────────┬───────────┬──────────┬────────┐
│ Stat    │ 2.5%   │ 50%    │ 97.5%  │ 99%    │ Avg       │ Stdev    │ Max    │
├─────────┼────────┼────────┼────────┼────────┼───────────┼──────────┼────────┤
│ Latency │ 259 ms │ 280 ms │ 540 ms │ 888 ms │ 299.15 ms │ 98.54 ms │ 947 ms │
└─────────┴────────┴────────┴────────┴────────┴───────────┴──────────┴────────┘
┌───────────┬─────────┬─────────┬─────────┬─────────┬─────────┬────────┬─────────┐
│ Stat      │ 1%      │ 2.5%    │ 50%     │ 97.5%   │ Avg     │ Stdev  │ Min     │
├───────────┼─────────┼─────────┼─────────┼─────────┼─────────┼────────┼─────────┤
│ Req/Sec   │ 14      │ 14      │ 35      │ 40      │ 33.1    │ 7.39   │ 14      │
├───────────┼─────────┼─────────┼─────────┼─────────┼─────────┼────────┼─────────┤
│ Bytes/Sec │ 6.83 kB │ 6.83 kB │ 17.1 kB │ 19.5 kB │ 16.2 kB │ 3.6 kB │ 6.83 kB │
└───────────┴─────────┴─────────┴─────────┴─────────┴─────────┴────────┴─────────┘

Req/Bytes counts sampled once per second.
# of samples: 10
341 requests in 10.12s, 162 kB read (0 errors)
```

### Analysis:

- **Total Requests Handled**: 341 requests in 10.12 seconds.
- **Average Throughput**: **33.1 req/sec** (peak: 40 req/sec).
- **Latency Distribution**:
  - Median (p50): **280 ms**
  - 97.5th Percentile: **540 ms**
  - 99th Percentile: **888 ms**
  - Error Rate: **0.00%** (341 successful 200 OK responses).

---

## 3. Benchmark 2: Deep Dependency Health (`GET /api/v1/ready`)

Tests the API under active relational database (`SELECT 1` on Supabase) and cache (`PING` on Upstash Redis) network queries on every request.

### Raw Autocannon Output:

```text
Running 10s test @ https://taskflow-api-staging-3lou.onrender.com/api/v1/ready
5 connections

┌─────────┬────────┬────────┬─────────┬─────────┬───────────┬───────────┬─────────┐
│ Stat    │ 2.5%   │ 50%    │ 97.5%   │ 99%     │ Avg       │ Stdev     │ Max     │
├─────────┼────────┼────────┼─────────┼─────────┼───────────┼───────────┼─────────┤
│ Latency │ 417 ms │ 597 ms │ 1341 ms │ 2229 ms │ 658.87 ms │ 256.88 ms │ 2229 ms │
└─────────┴────────┴────────┴─────────┴─────────┴───────────┴───────────┴─────────┘
┌───────────┬─────┬──────┬─────────┬─────────┬─────────┬─────────┬─────────┐
│ Stat      │ 1%  │ 2.5% │ 50%     │ 97.5%   │ Avg     │ Stdev   │ Min     │
├───────────┼─────┼──────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ Req/Sec   │ 0   │ 0    │ 8       │ 10      │ 7.4     │ 2.8     │ 6       │
├───────────┼─────┼──────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ Bytes/Sec │ 0 B │ 0 B  │ 4.32 kB │ 5.39 kB │ 4.04 kB │ 1.53 kB │ 3.23 kB │
└───────────┴─────┴──────┴─────────┴─────────┴─────────┴─────────┴─────────┘

Req/Bytes counts sampled once per second.
# of samples: 10
79 requests in 10.12s, 40.4 kB read
```

### Analysis & Cross-Cloud Network Insight:

- **Throughput**: **7.4 req/sec** under continuous multi-dependency validation.
- **Latency Distribution**:
  - Median (p50): **597 ms**
  - 97.5th Percentile: **1,341 ms**
  - 99th Percentile: **2,229 ms**
- **Root Cause of Dependency Latency**:
  - Render API is deployed in AWS US-West (Oregon).
  - Supabase PostgreSQL is hosted in AWS Asia-Pacific (Sydney, Australia).
  - The ~400–600ms baseline latency accurately reflects the speed-of-light inter-continental fiber transit (~150ms round-trip trans-Pacific packet latency) plus SSL handshake and database query execution.
  - In a co-located production setup (e.g. AWS us-east-1 VPC via Terraform), this latency drops to < 5ms.

---

## 4. Benchmark 3: Mutation Rate Limiter Enforcement

Tests the sliding-window rate-limiting interceptor backed by Upstash Redis. The API is configured to allow a maximum of **60 mutation requests per 60-second window** per client IP.

### Test Execution:

75 rapid asynchronous `POST /api/v1/auth/login` requests were dispatched in a single batch.

```text
Sending 75 rapid POST requests to https://taskflow-api-staging-3lou.onrender.com/api/v1/auth/login...
Rate Limit Test Results:
  - 401 Unauthorized (allowed through): 60 requests
  - 429 Too Many Requests (rate-limited): 15 requests
  - Other / Network Errors: 0
```

### Analysis:

- **Deterministic Enforcement**: Exactly **60 requests** were accepted into the business logic pipeline before the Redis sliding-window token was depleted.
- **Fail-Safe Throttling**: Requests 61 through 75 were immediately rejected at the interceptor boundary with **HTTP 429 Too Many Requests**, protecting database connection pools and backend memory from brute-force authentication attempts.

---

## 5. Free-Tier Resource Limits & Saturation Thresholds

| Resource            | Free-Tier Allocation  | Saturation Point               | Recommended Upgrade Trigger          |
| :------------------ | :-------------------- | :----------------------------- | :----------------------------------- |
| **API Compute**     | 0.1 vCPU / 512MB RAM  | ~35–45 req/sec sustained       | CPU spikes > 80% during peak traffic |
| **PostgreSQL Pool** | 15 direct connections | ~10–12 concurrent transactions | Max connection warnings in logs      |
| **Upstash Redis**   | 10,000 commands / day | ~7 requests/min average daily  | Approaching 8,000 daily commands     |
| **Storage Egress**  | 2 GB / month          | ~200 full 10MB downloads       | Monthly egress usage > 1.5 GB        |
