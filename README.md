# Payment Verifier

**Ensure you are always paid!** Payment Verifier is designed for developers who build applications and services for third parties. If you depend on correct and timely payment from your customers, this tool is for you!

This system **automatically blocks project access when payments are overdue**, tracks all payment-related API calls, and provides real-time monitoring of your revenue stream. Protect your business from non-paying clients with automated enforcement.

## Requirements

- **Docker** (version 20.10+)
- **Docker Compose** (version 2.0+)

## Control Scripts

Payment Verifier includes helper scripts for building, deploying, and managing the service:

```bash
# help - Display help message
./payment-verifier help

# build - Build the Docker image and push it to the registry
./control/build.sh

# deploy - Deploy Payment Verifier to a remote server
./control/deploy.sh

# start-docker - Start already built container (preferred method)
docker compose up -d

# rebuild-docker - Force rebuild with docker compose
docker compose up -d --build

# kill-docker - Forcefully kill all running docker containers
docker compose down

# enter [name|id] - Enter a running docker container
docker exec -it <container-name> bash
```

## Advanced Integration

### Automatic Logging with Middleware

For applications that need automatic logging of all payment-related requests, use these middleware examples:

### Python + FastAPI (Middleware)

```python
from typing import Any, Callable, Dict
from fastapi import FastAPI, Request
import httpx
from datetime import datetime

app = FastAPI()

PAYMENT_VERIFIER_URL: str = "http://localhost:8111"
PROJECT_ID: int = 1

class PaymentVerificationMiddleware:
    def __init__(self, app: Any) -> None:
        self.app = app
        self.client = httpx.AsyncClient()

    async def __call__(self, scope: Dict[str, Any], receive: Callable, send: Callable) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope, receive)
        body = await request.body()

        async def send_with_logging(message: Dict[str, Any]) -> None:
            if message["type"] == "http.response.body":
                await self.log_to_verifier(
                    method=scope["method"],
                    path=scope["path"],
                    status_code=message.get("status", 200),
                    request_body=body.decode() if body else "",
                    response_body=message.get("body", b"").decode()
                )
            await send(message)

        await self.app(scope, request.receive, send_with_logging)

    async def log_to_verifier(
        self,
        method: str,
        path: str,
        status_code: int,
        request_body: str,
        response_body: str
    ) -> None:
        try:
            await self.client.post(
                f"{PAYMENT_VERIFIER_URL}/api/logs",
                json={
                    "project_id": PROJECT_ID,
                    "endpoint": path,
                    "method": method,
                    "status_code": status_code,
                    "request_body": request_body,
                    "response_body": response_body,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
        except Exception as e:
            print(f"Payment Verifier logging error: {e}")

app.add_middleware(PaymentVerificationMiddleware)

@app.post("/charge")
async def charge(payment: Dict[str, Any]) -> Dict[str, Any]:
    return {"status": "success", "amount": payment.get("amount")}
```

### JavaScript/Node.js + Express (TypeScript)

```typescript
import express, { Request, Response, NextFunction } from 'express';
import axios from 'axios';

const app = express();
app.use(express.json());

const PAYMENT_VERIFIER_URL: string = 'http://localhost:8111';
const PROJECT_ID: number = 1;

interface LogPayload {
  project_id: number;
  endpoint: string;
  method: string;
  status_code: number;
  request_body: string;
  response_body: string;
  timestamp: string;
}

const paymentVerificationMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const originalSend = res.send.bind(res);

  res.send = function(data: any): Response {
    const payload: LogPayload = {
      project_id: PROJECT_ID,
      endpoint: req.originalUrl,
      method: req.method,
      status_code: res.statusCode,
      request_body: JSON.stringify(req.body),
      response_body: typeof data === 'string' ? data : JSON.stringify(data),
      timestamp: new Date().toISOString()
    };

    axios.post(`${PAYMENT_VERIFIER_URL}/api/logs`, payload)
      .catch(err => console.error('Payment Verifier error:', err));

    return originalSend(data);
  };

  next();
};

app.use(paymentVerificationMiddleware);

interface ChargeRequest {
  amount: number;
  currency: string;
}

app.post('/charge', (req: Request<{}, {}, ChargeRequest>, res: Response) => {
  const { amount, currency } = req.body;

  res.json({
    status: 'success',
    amount,
    currency,
    transaction_id: `txn_${Date.now()}`
  });
});

app.listen(3000, () => {
  console.log('API server running on port 3000');
});
```

### PHP + Laravel

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Http;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class PaymentVerificationMiddleware
{
    private string $paymentVerifierUrl = 'http://localhost:8111';
    private int $projectId = 1;

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if ($this->isPaymentRelatedRoute($request)) {
            $this->logToPaymentVerifier(
                method: $request->method(),
                endpoint: $request->path(),
                statusCode: $response->status(),
                requestBody: json_encode($request->all()),
                responseBody: $response->getContent()
            );
        }

        return $response;
    }

    private function logToPaymentVerifier(
        string $method,
        string $endpoint,
        int $statusCode,
        string $requestBody,
        string $responseBody
    ): void {
        try {
            Http::post("{$this->paymentVerifierUrl}/api/logs", [
                'project_id' => $this->projectId,
                'endpoint' => $endpoint,
                'method' => $method,
                'status_code' => $statusCode,
                'request_body' => $requestBody,
                'response_body' => $responseBody,
                'timestamp' => Carbon::now()->toIso8601String()
            ]);
        } catch (\Exception $e) {
            Log::error('Payment Verifier logging failed: ' . $e->getMessage());
        }
    }

    private function isPaymentRelatedRoute(Request $request): bool
    {
        return str_contains($request->path(), 'charge') ||
               str_contains($request->path(), 'payment') ||
               str_contains($request->path(), 'api');
    }
}

protected array $routeMiddleware = [
    'payment.verify' => \App\Http\Middleware\PaymentVerificationMiddleware::class,
];

Route::post('/charge', function (Request $request): \Illuminate\Http\JsonResponse {
    $amount = $request->input('amount');
    $currency = $request->input('currency', 'USD');

    return response()->json([
        'status' => 'success',
        'amount' => $amount,
        'currency' => $currency,
        'transaction_id' => 'txn_' . time()
    ]);
})->middleware('payment.verify');
```

## License

Copyright 2026 Patrik Čelko, see [LICENSE](LICENSE) for details.

---
