# Payment Verifier

**Ensure you are always paid!** Payment Verifier is designed for developers who build applications and services for third parties. If you depend on correct and timely payment from your customers, this tool is for you!

This system **automatically blocks project access when payments are overdue**, tracks all payment-related API calls, and provides real-time monitoring of your revenue stream. Protect your business from non-paying clients with automated enforcement.

![Version](https://img.shields.io/badge/version-1.5.11-blue)
![Python 3.12](https://img.shields.io/badge/Python-3.13-red)

<img width="2003" height="1255" alt="image" src="https://github.com/user-attachments/assets/5915da44-7373-4c9a-a69a-f361fed1a268" />
<img width="2003" height="1506" alt="image" src="https://github.com/user-attachments/assets/f4a96534-f1ad-4f85-b534-addcbae1555c" />

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

PAYMENT_VERIFIER_URL: str = 'http://localhost:8111'
PROJECT_ID: int = 1

async def payment_verification_middleware(request: Request, call_next: Callable) -> Response:
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f'{PAYMENT_VERIFIER_URL}/api/verification/project/{PROJECT_ID}'
            )

            if response.status_code != 200 or not response.json().get('is_active', False):
                return JSONResponse(
                    status_code=402,
                    content=response.json() if response.status_code == 200 else {
                        'error': 'Payment verification failed'
                    }
                )
        except Exception:
            return JSONResponse(
                status_code=503,
                content={'error': 'Payment verification service unavailable'}
            )

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

const PAYMENT_VERIFIER_URL: string = 'http://localhost:8111';
const PROJECT_ID: number = 1;

const paymentVerificationMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const response = await axios.get(
      `${PAYMENT_VERIFIER_URL}/api/verification/project/${PROJECT_ID}`
    );

    if (!response.data.is_active) {
      res.status(402).json(response.data);
      return;
    }

    next();
  } catch (error) {
    res.status(503).json({ error: 'Payment verification service unavailable' });
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
    private string $paymentVerifierUrl = 'http://localhost:8111';
    private int $projectId = 1;

    public function handle(Request $request, Closure $next): Response
    {
        try {
            $response = Http::get(
                "{$this->paymentVerifierUrl}/api/verification/project/{$this->projectId}"
            );

            if (!$response->successful() || !$response->json('is_active', false)) {
                return response()->json(
                    $response->json() ?? ['error' => 'Payment verification failed'],
                    402
                );
            }
        } catch (\Exception $e) {
            return response()->json(
                ['error' => 'Payment verification service unavailable'],
                503
            );
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

Copyright 2026 Patrik Čelko, see [LICENSE](LICENSE) for details.

---
