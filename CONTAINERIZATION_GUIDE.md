# SchoolPayERP Containerization Guide

## Quick Start

### Prerequisites
- Docker installed and running
- Docker Compose (optional, for local development)
- MongoDB instance (local, Docker, or MongoDB Atlas)

### Build Docker Images

#### Build Backend Image
```bash
cd schoolpay-enterprise/backend
docker build -t schoolpay-backend:v1.0.0 .
docker build -t schoolpay-backend:latest .
```

#### Build Frontend Image
```bash
cd schoolpay-enterprise/frontend
docker build -t schoolpay-frontend:v1.0.0 .
docker build -t schoolpay-frontend:latest .
```

### Run Containers Locally

#### Backend Container
```bash
docker run -d \
  --name schoolpay-backend \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e MONGO_URI=mongodb://host.docker.internal:27017/schoolpay \
  -e CORS_ORIGINS=http://localhost \
  -e JWT_SECRET=dev-secret-key \
  schoolpay-backend:latest
```

#### Frontend Container
```bash
docker run -d \
  --name schoolpay-frontend \
  -p 80:80 \
  -e VITE_API_URL=http://localhost:3000/api \
  schoolpay-frontend:latest
```

#### With Docker Compose
```bash
cd schoolpay-enterprise
docker-compose up -d
```

## Environment Variables

### Backend Required Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Application environment | `production` |
| `PORT` | Server port | `3000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://user:pass@host:27017/db` |
| `CORS_ORIGINS` | Allowed CORS origins | `http://localhost,https://app.com` |
| `JWT_SECRET` | JWT signing secret | Generate a secure random string |

### Backend Optional Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `MPESA_CONSUMER_KEY` | M-PESA API key | Your key |
| `MPESA_CONSUMER_SECRET` | M-PESA API secret | Your secret |
| `MPESA_PASSKEY` | M-PESA passkey | Your passkey |
| `MPESA_SHORTCODE` | M-PESA till number | 123456 |
| `AFRICASTALKING_API_KEY` | Africa's Talking API key | Your key |
| `AFRICASTALKING_USERNAME` | Africa's Talking username | Your username |

### Frontend Optional Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://backend:3000/api` |

## Dockerfile Overview

### Backend Dockerfile
- **Base Image**: `node:20-alpine`
- **Build Strategy**: Multi-stage (separates build from runtime)
- **Port**: 3000
- **User**: `nodejs` (non-root)
- **Health Check**: GET `/api/health`
- **Size**: Optimized to ~150-200MB

### Frontend Dockerfile
- **Build Stage**: `node:20-alpine`
- **Runtime Stage**: `nginx:alpine`
- **Port**: 80
- **User**: `nginx` (non-root)
- **Health Check**: HTTP GET `/`
- **Size**: Optimized to ~50-80MB

## Running Tests

### Verify Backend Health
```bash
docker exec schoolpay-backend curl http://localhost:3000/api/health
# Expected response: {"status":"healthy"}
```

### Verify Frontend Health
```bash
docker exec schoolpay-frontend wget -O- http://localhost/
# Should return HTML content
```

### View Logs
```bash
# Backend logs
docker logs schoolpay-backend

# Frontend logs
docker logs schoolpay-frontend
```

## Push to Registry

### Azure Container Registry (ACR)
```bash
# Login to ACR
az acr login --name <acr-name>

# Tag images
docker tag schoolpay-backend:v1.0.0 <acr-name>.azurecr.io/schoolpay-backend:v1.0.0
docker tag schoolpay-frontend:v1.0.0 <acr-name>.azurecr.io/schoolpay-frontend:v1.0.0

# Push images
docker push <acr-name>.azurecr.io/schoolpay-backend:v1.0.0
docker push <acr-name>.azurecr.io/schoolpay-frontend:v1.0.0
```

### Docker Hub
```bash
# Login to Docker Hub
docker login

# Tag images
docker tag schoolpay-backend:v1.0.0 <username>/schoolpay-backend:v1.0.0
docker tag schoolpay-frontend:v1.0.0 <username>/schoolpay-frontend:v1.0.0

# Push images
docker push <username>/schoolpay-backend:v1.0.0
docker push <username>/schoolpay-frontend:v1.0.0
```

## Security Considerations

✅ **Implemented**
- Non-root user execution for both services
- Multi-stage builds to minimize image size and attack surface
- Health checks for container orchestration platforms
- Environment variable-based configuration (no hardcoded secrets)
- .dockerignore to exclude sensitive files

⚠️ **Recommended for Production**
- Use secrets management (Kubernetes Secrets, Azure Key Vault)
- Implement image scanning (Trivy, Azure Container Registry scanning)
- Use private container registry
- Enable RBAC on registry access
- Regularly update base images
- Use network policies to restrict container communication
- Implement API rate limiting
- Enable HTTPS/TLS for all traffic
- Use managed identities for Azure service authentication

## Image Optimization

### Backend Image Size Optimization
- Multi-stage build removes dev dependencies
- Alpine Linux base image (~5MB)
- npm cache cleaned after installation
- Estimated final size: ~150-200MB

### Frontend Image Size Optimization
- Multi-stage build separates Node from Nginx
- Build assets only in final image (~dist folder)
- Nginx Alpine base image (~20MB)
- Estimated final size: ~50-80MB

## Troubleshooting

### Backend Container Won't Start
1. Check environment variables: `docker inspect schoolpay-backend`
2. Check logs: `docker logs schoolpay-backend`
3. Verify MongoDB connection: Test MONGO_URI independently
4. Check port 3000 availability: `netstat -tulpn | grep 3000`

### Frontend Shows 502 Bad Gateway
1. Verify backend container is running: `docker ps`
2. Check backend health: Visit `http://localhost:3000/api/health`
3. Check frontend logs: `docker logs schoolpay-frontend`
4. Verify CORS configuration on backend

### Containers Keep Restarting
1. Check health check configuration
2. View logs: `docker logs --tail 50 container-name`
3. Increase health check timeout if needed
4. Verify all required environment variables are set

## Next Steps

1. **Local Testing**: Use docker-compose for local development
2. **Azure Deployment**: 
   - Generate Kubernetes manifests using `appmod-generate-k8s-manifest`
   - Deploy to Azure Container Apps or AKS
3. **CI/CD Pipeline**: Automate image building and pushing
4. **Monitoring**: Configure Application Insights, Log Analytics
5. **Scaling**: Configure auto-scaling policies in production

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Node.js Best Practices](https://nodejs.org/en/docs/guides/)
- [Nginx Configuration](https://nginx.org/en/docs/)
- [Azure Container Apps](https://learn.microsoft.com/azure/container-apps/)
- [Azure Kubernetes Service](https://learn.microsoft.com/azure/aks/)
