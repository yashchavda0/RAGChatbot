---
name: deploy-ready
description: Prepare system for production deployment
disable-model-invocation: true
---

Prepare the RAG chatbot for production deployment.

## Usage
```
/deploy-ready [--env staging|production] [--check]
```

## Checklist

### Security
- [ ] All secrets in environment variables
- [ ] CORS configured for production domains
- [ ] Rate limiting enabled
- [ ] HTTPS enforced
- [ ] Input validation on all endpoints

### Performance
- [ ] Database connection pooling
- [ ] Redis caching configured
- [ ] Static assets optimized
- [ ] Gzip compression enabled

### Infrastructure
- [ ] Docker images built
- [ ] Health checks configured
- [ ] Logging to centralized system
- [ ] Monitoring dashboards ready
- [ ] Alert rules configured

### Configuration
- [ ] Environment variables documented
- [ ] Secrets rotated
- [ ] Backup strategy in place
- [ ] Rollback plan ready

### Testing
- [ ] All tests passing
- [ ] Load tests completed
- [ ] Security scan passed
- [ ] Smoke tests defined

## Docker Commands
```bash
# Build images
docker-compose build

# Push to registry
docker tag rag-chatbot-backend registry.example.com/rag-backend:v1.0
docker push registry.example.com/rag-backend:v1.0

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

## Examples
```
/deploy-ready --check
/deploy-ready --env staging
/deploy-ready --env production
```
