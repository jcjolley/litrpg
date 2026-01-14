# Makefile for LitRPG project
SHELL := /bin/bash

.PHONY: build-lambda build-ui deploy-ui deploy test clean aws-login stats stats-local add export-prod import-local setup-local-prod

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
	./gradlew build -Dquarkus.native.enabled=true -Dquarkus.native.container-build=true -x test

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

# Run all tests
test:
	./gradlew test

# Clean build artifacts
clean:
	./gradlew clean
	rm -rf ui/dist

# Local development: start Quarkus and UI dev servers
dev:
	@echo "Starting LocalStack, Quarkus, and UI..."
	./scripts/dev-start.sh

# View analytics stats from production DynamoDB
stats: aws-login
	eval "$$(aws configure export-credentials --format env)" && \
		AWS_REGION=us-west-2 \
		./gradlew :curator:run --args="stats"

# View analytics stats from local DynamoDB (LocalStack)
stats-local:
	./gradlew :curator:run --args="stats --dynamo http://localhost:4566"

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
		./gradlew :curator:run --args="add -y $(URL)"

# Export books from production DynamoDB to local file
export-prod: aws-login
	@echo "Exporting books from production DynamoDB..."
	eval "$$(aws configure export-credentials --format env)" && \
		AWS_REGION=us-west-2 \
		./gradlew :curator:run --args="export -o ../data/books-prod.json"
	@echo "Exported to data/books-prod.json"

# Import books from file to local DynamoDB (LocalStack)
import-local:
	@if [ ! -f "data/books-prod.json" ]; then \
		echo "Error: data/books-prod.json not found. Run 'make export-prod' first."; \
		exit 1; \
	fi
	@echo "Importing books to LocalStack DynamoDB..."
	./gradlew :curator:run --args="import ../data/books-prod.json --dynamo http://localhost:4566"

# Full local setup with prod data: export from prod, import to local
setup-local-prod: export-prod import-local
	@echo "Local environment ready with production data!"
