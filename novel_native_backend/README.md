# Novel Native Backend

Parallel Spring Boot backend for the current Next.js server logic. The frontend is not wired to this yet; use it to verify the Java implementation before migrating traffic.

## Configuration

Set the same core secrets already used by the Next.js app:

```bash
export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
export GEMINI_API_KEY="your-gemini-key"
export CORS_ALLOWED_ORIGINS="http://localhost:3000"
```

Optional model overrides:

```bash
export GEMINI_EMBEDDING_MODEL="gemini-embedding-2"
export GEMINI_GENERATION_MODEL="gemini-2.5-flash"
```

## Run

```bash
mvn spring-boot:run
```

The app runs on `http://localhost:8080` by default.

## Test The Ask-Novel Flow

Anonymous/normal-plan request:

```bash
curl -X POST http://localhost:8080/api/ask-novel \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is the name of the artifact?",
    "novelId": "00000000-0000-0000-0000-000000000000"
  }'
```

Migration-phase authenticated request, where Next.js can pass the current NextAuth user:

```bash
curl -X POST http://localhost:8080/api/ask-novel \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is the name of the artifact?",
    "novelId": "00000000-0000-0000-0000-000000000000",
    "user": {
      "id": "next-auth-user-id",
      "email": "reader@example.com",
      "name": "Reader Name"
    }
  }'
```
