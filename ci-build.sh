#!/bin/bash
echo "Running lint checks..."
npm run lint
if [ $? -ne 0 ]; then
  echo "Lint checks failed!"
  exit 1
fi

echo "Running unit tests..."
npm run test
if [ $? -ne 0 ]; then
  echo "Unit tests failed!"
  exit 1
fi

echo "Running integration tests..."
npm run integration-test
if [ $? -ne 0 ]; then
  echo "Integration tests failed!"
  exit 1
fi

echo "Running Vercel build..."
vercel build