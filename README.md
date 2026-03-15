# Payment Verifier

**Ensure you are always paid!** Payment Verifier is designed for developers who build applications and services for third parties. If you depend on correct and timely payment from your customers, this tool is for you!

This system **automatically blocks project access when payments are overdue**, tracks all payment-related API calls, and provides real-time monitoring of your revenue stream. Protect your business from non-paying clients with automated enforcement.

![Version](https://img.shields.io/badge/version-1.5.11-blue)
![Python 3.12](https://img.shields.io/badge/Python-3.13-red)

## Requirements

- **Docker** (version 20.10+)
- **Docker Compose** (version 2.0+)

## Control Scripts

Payment Verifier includes helper scripts for building, deploying, and managing the service:

```bash
# Display help message
./payment-verifier help

# Build the Docker image and push it to the registry
./payment-verifier build

# Deploy Payment Verifier to a remote server
./payment-verifier deploy

# Start already built container (preferred method)
./payment-verifier start-docker

# Force rebuild with docker compose
./payment-verifier rebuild-docker

# Forcefully kill all running docker containers
./payment-verifier kill-docker

# Enter a running docker container
./payment-verifier enter [name|id]
```

## Integration Examples

Use these middleware examples to protect all endpoints with automatic payment verification.
If payment fails, the middleware returns 402 with the Payment Verifier response.

### Python + FastAPI (Middleware)

```python
from typing import Callable, Dict, Any
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
import httpx

app = FastAPI()

PAYMENT_VERIFIER_URL: str = 'https://payment-verifier.com'
API_TOKEN: str = 'your-api-token'

async def payment_verification_middleware(request: Request, call_next: Callable) -> Response:
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f'{PAYMENT_VERIFIER_URL}/?token={API_TOKEN}'
            )

            if response.status_code != 200:
                return JSONResponse(
                    status_code=response.status_code,
                    content=response.json() if response.headers.get('content-type') == 'application/json' else {
                        'error': response.text
                    }
                )
        except Exception:
            # Service unavailable - allow app to continue normally
            pass

    return await call_next(request)

app.middleware("http")(payment_verification_middleware)

@app.get('/project/{project_id}')
async def get_project(project_id: int) -> Dict[str, Any]:
    return {'project_id': project_id, 'data': 'Your project data'}

@app.post('/project/{project_id}/action')
async def project_action(project_id: int, action: Dict[str, Any]) -> Dict[str, Any]:
    return {'status': 'success', 'action': action}
```

### JavaScript/Node.js + Express (TypeScript)

```typescript
import express, { Request, Response, NextFunction } from 'express';
import axios from 'axios';

const app = express();
app.use(express.json());

const PAYMENT_VERIFIER_URL: string = 'https://payment-verifier.com';
const API_TOKEN: string = 'your-api-token';

const paymentVerificationMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const response = await axios.get(
      `${PAYMENT_VERIFIER_URL}/?token=${API_TOKEN}`
    );

    if (response.status !== 200) {
      res.status(response.status).json(response.data);
      return;
    }

    next();
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      // Service unavailable - allow app to continue normally
      next();
    }
  }
};

app.use(paymentVerificationMiddleware);

app.get('/project/:project_id', (req: Request, res: Response) => {
  res.json({ project_id: req.params.project_id, data: 'Your project data' });
});

app.post('/project/:project_id/action', (req: Request, res: Response) => {
  res.json({ status: 'success', action: req.body });
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

class PaymentVerificationMiddleware
{
    private string $paymentVerifierUrl = 'https://payment-verifier.com';
    private string $apiToken = 'your-api-token';

    public function handle(Request $request, Closure $next): Response
    {
        try {
            $response = Http::get(
                "{$this->paymentVerifierUrl}/?token={$this->apiToken}"
            );

            if (!$response->successful()) {
                return response()->json(
                    $response->json() ?? ['error' => $response->body()],
                    $response->status()
                );
            }
        } catch (\Exception $e) {
            // Service unavailable - allow app to continue normally
        }

        return $next($request);
    }
}

protected array $routeMiddleware = [
    'payment.verify' => \App\Http\Middleware\PaymentVerificationMiddleware::class,
];

Route::middleware('payment.verify')->group(function () {
    Route::get('/project/{id}', fn($id) => ['project_id' => $id, 'data' => 'Your project data']);
    Route::post('/project/{id}/action', fn($id, Request $req) => ['status' => 'success', 'action' => $req->all()]);
});
```

## License

Copyright 2025-2026, created by Patrik Čelko, see [LICENSE](LICENSE) for more details.

---
