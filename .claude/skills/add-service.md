---
name: add-service
description: Create a new service class in backend/services/
---

Generate a new service class following project patterns.

## Usage
```
/add-service <service-name> [--type api|database|cache|llm|processing]
```

## Service Template
```python
class <ServiceName>Service:
    _instance: Optional['<ServiceName>Service'] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self.logger = logging.getLogger(__name__)
        self._config = self._load_config()
        self._setup()
        self._initialized = True

    async def execute(self, *args, **kwargs) -> Any:
        # Main service method
        pass
```

## Service Types
- `api`: External API integration (aiohttp, requests)
- `database`: SQLAlchemy operations
- `cache`: Redis caching
- `llm`: LLM provider integration
- `processing`: Data processing

## Examples
```
/add-service analytics_service --type api
/add-service document_metadata_service --type database
/add-service query_cache_service --type cache
```
