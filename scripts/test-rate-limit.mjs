const stagingUrl =
  "https://taskflow-api-staging-3lou.onrender.com/api/v1/auth/login";

async function testRateLimit() {
  console.log(`Sending 75 rapid POST requests to ${stagingUrl}...`);
  const results = { 200: 0, 400: 0, 401: 0, 429: 0, other: 0 };
  const promises = [];

  for (let i = 0; i < 75; i++) {
    promises.push(
      fetch(stagingUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "loadtest@example.com",
          password: "wrong",
        }),
      })
        .then((res) => {
          results[res.status] = (results[res.status] || 0) + 1;
        })
        .catch((err) => {
          results.other = (results.other || 0) + 1;
        }),
    );
  }

  await Promise.all(promises);
  console.log("Rate Limit Test Results:", results);
}

testRateLimit();
