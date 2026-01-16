# Makefile for LitRPG project
SHELL := /bin/bash

.PHONY: build build-lambda build-ui deploy-ui deploy test test-class clean aws-login stats stats-local list list-local add remove refresh export-prod import-local setup-local-prod localstack localstack-init localstack-down curator curator-local migrate-genres migrate-genres-local help

# Check AWS credentials and login if needed
aws-login:
	@if ! aws sts get-caller-identity > /dev/null 2>&1; then \
		echo "AWS credentials expired or missing. Logging in..."; \
		aws sso login; \
	else \
		echo "AWS credentials valid."; \
	fi

# Build native Lambda function for AWS deployment
build-lambda:
	gradlew build -Dquarkus.native.enabled=true -Dquarkus.native.container-build=true -x test

# Build UI for production
build-ui:
	cd ui && npm run build

# Deploy UI to S3 and invalidate CloudFront cache
deploy-ui: aws-login
	@echo "Deploying UI to S3..."
	cd terraform/environments/dev && \
		eval "$$(aws configure export-credentials --format env)" && \
		BUCKET=$$(terraform output -raw frontend_bucket) && \
		DIST_ID=$$(terraform output -raw cloudfront_distribution_id) && \
		aws s3 sync ../../../ui/dist "s3://$$BUCKET" --delete && \
		aws cloudfront create-invalidation --distribution-id "$$DIST_ID" --paths "/*"

# Apply Terraform infrastructure changes
deploy-infra: aws-login
	cd terraform/environments/dev && \
		eval "$$(aws configure export-credentials --format env)" && \
		terraform apply -auto-approve

# Full deployment: build and deploy everything
deploy: build-lambda build-ui deploy-infra deploy-ui

# Build everything (no native, for local dev)
build:
	gradlew build -x test

# Run all tests (requires LocalStack running)
test: localstack-init
	gradlew test

# Run a specific test class
# Usage: make test-class CLASS=BooksQueryTest
test-class: localstack-init
	@if [ -z "$(CLASS)" ]; then \
		echo "Usage: make test-class CLASS=<TestClassName>"; \
		exit 1; \
	fi
	gradlew test --tests "*.$(CLASS)"

# Start LocalStack and initialize DynamoDB table
localstack-init: localstack
	@echo "Initializing LocalStack DynamoDB..."
	@bash scripts/init-localstack.sh

# Clean build artifacts
clean:
	gradlew clean
	rm -rf ui/dist

# Start LocalStack container (idempotent)
localstack:
	@if ! docker ps | grep -q localstack; then \
		echo "Starting LocalStack..."; \
		docker compose up -d; \
		sleep 3; \
	fi

# Stop LocalStack container
localstack-down:
	docker compose down

# Local development: start Quarkus and UI dev servers
dev:
	@echo "Starting LocalStack, Quarkus, and UI..."
	./scripts/dev-start.sh

# View analytics stats from production DynamoDB
stats: aws-login
	eval "$$(aws configure export-credentials --format env)" && \
		AWS_REGION=us-west-2 \
		gradlew :curator:run --args="stats"

# View analytics stats from local DynamoDB (LocalStack)
stats-local:
	gradlew :curator:run --args="stats --dynamo http://localhost:4566"

# List all books in production
list: aws-login
	eval "$$(aws configure export-credentials --format env)" && \
		AWS_REGION=us-west-2 \
		gradlew :curator:run --args="list"

# List all books in local DynamoDB
list-local:
	gradlew :curator:run --args="list --dynamo http://localhost:4566"

# Quick add/update a book from Audible or Royal Road URL
# Usage: make add URL=https://www.audible.com/pd/Book-Title/B0XXXXXXXX
#        make add URL=https://www.royalroad.com/fiction/12345/title
add: aws-login
	@if [ -z "$(URL)" ]; then \
		echo "Usage: make add URL=<audible-url>"; \
		exit 1; \
	fi
	eval "$$(aws configure export-credentials --format env)" && \
		AWS_REGION=us-west-2 \
		gradlew :curator:run --args="add -y $(URL)"

# Export books from production DynamoDB to local file
export-prod: aws-login
	@echo "Exporting books from production DynamoDB..."
	eval "$$(aws configure export-credentials --format env)" && \
		AWS_REGION=us-west-2 \
		gradlew :curator:run --args="export -o ../data/books-prod.json"
	@echo "Exported to data/books-prod.json"

# Import books from file to local DynamoDB (LocalStack)
import-local:
	@if [ ! -f "data/books-prod.json" ]; then \
		echo "Error: data/books-prod.json not found. Run 'make export-prod' first."; \
		exit 1; \
	fi
	@echo "Importing books to LocalStack DynamoDB..."
	gradlew :curator:run --args="import ../data/books-prod.json --dynamo http://localhost:4566"

# Full local setup with prod data: export from prod, import to local
setup-local-prod: export-prod import-local
	@echo "Local environment ready with production data!"

# Remove a book by ID
# Usage: make remove ID=abc123
remove: aws-login
	@if [ -z "$(ID)" ]; then \
		echo "Usage: make remove ID=<book-id>"; \
		exit 1; \
	fi
	eval "$$(aws configure export-credentials --format env)" && \
		AWS_REGION=us-west-2 \
		gradlew :curator:run --args="remove $(ID)"

# Refresh a book (re-scrape and update)
# Usage: make refresh ID=abc123
refresh: aws-login
	@if [ -z "$(ID)" ]; then \
		echo "Usage: make refresh ID=<book-id>"; \
		exit 1; \
	fi
	eval "$$(aws configure export-credentials --format env)" && \
		AWS_REGION=us-west-2 \
		gradlew :curator:run --args="refresh $(ID)"

# Migrate all books to multi-genre classification (production)
migrate-genres: aws-login
	eval "$$(aws configure export-credentials --format env)" && \
		AWS_REGION=us-west-2 \
		gradlew :curator:run --args="migrate-genres"

# Migrate all books to multi-genre classification (local)
migrate-genres-local:
	gradlew :curator:run --args="migrate-genres --dynamo http://localhost:4566"

# Show all available commands
help:
	@echo "LitRPG Makefile Commands:"
	@echo ""
	@echo "Development:"
	@echo "  make dev              Start local dev environment"
	@echo "  make test             Run all tests (starts LocalStack if needed)"
	@echo "  make test-class CLASS=<name>  Run single test class"
	@echo "  make localstack       Start LocalStack container"
	@echo "  make localstack-init  Start LocalStack and create DynamoDB table"
	@echo "  make clean            Clean build artifacts"
	@echo ""
	@echo "Build & Deploy:"
	@echo "  make build-lambda     Build native Lambda"
	@echo "  make build-ui         Build UI for production"
	@echo "  make deploy           Full deployment"
	@echo "  make deploy-infra     Deploy Terraform only"
	@echo "  make deploy-ui        Deploy UI only"
	@echo ""
	@echo "Curator (Production):"
	@echo "  make list             List all books"
	@echo "  make stats            View analytics"
	@echo "  make add URL=<url>    Add book from Audible/RoyalRoad"
	@echo "  make remove ID=<id>   Remove a book"
	@echo "  make refresh ID=<id>  Re-scrape a book"
	@echo "  make export-prod      Export to data/books-prod.json"
	@echo "  make migrate-genres   Migrate books to multi-genre system"
	@echo ""
	@echo "Curator (Local):"
	@echo "  make list-local       List books in LocalStack"
	@echo "  make stats-local      View local analytics"
	@echo "  make import-local     Import from data/books-prod.json"
	@echo "  make setup-local-prod Export prod + import to local"
	@echo "  make migrate-genres-local  Migrate local books to multi-genre"
