```
# 1. Build and run
docker compose up --build -d

# 2. Check logs
docker compose logs -f backend

# 3. Verify API
curl http://localhost:4000/api/health

# 4. rebuild
docker compose down
docker compose build --no-cache
```