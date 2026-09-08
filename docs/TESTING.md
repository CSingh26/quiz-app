# Testing

Unit/controller tests use Node's built-in test runner. Browser tests use Chromium desktop/mobile viewports with explicit fixture HTTP responses and verify the answer-text protocol and unavailable-room redirect.

The integration test requires an isolated MongoDB replica set, and deliberately refuses any URL outside its localhost:27028 test-database prefix. It creates unique fixture rows and removes only those rows afterward. It checks actual nested import persistence, grading, linked-module deletion rejection and rollback after an injected leaderboard write failure.

```sh
docker run --rm -d --name quizbee-local-tests -p 127.0.0.1:27028:27017 mongo:7.0 --replSet rs0 --bind_ip_all
docker exec quizbee-local-tests mongosh --quiet --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"127.0.0.1:27017"}]})'
DATABASE_URL='mongodb://127.0.0.1:27028/quizbee_portfolio_test?replicaSet=rs0&directConnection=true' backend/node_modules/.bin/prisma db push --schema backend/prisma/schema.prisma
QUIZBEE_TEST_DATABASE_URL='mongodb://127.0.0.1:27028/quizbee_portfolio_test?replicaSet=rs0&directConnection=true' npm run test:integration --prefix backend
docker stop quizbee-local-tests
```

Wait until the container accepts connections before initiating the replica set. CI pins the image digest and performs this readiness check automatically. Use a separate local development database for interactive work; never aim integration tests at production data.
