# Makefile for LitRPG project

.PHONY: build-lambda build-ui deploy-ui deploy test clean

# Build native Lambda function for AWS deployment
build-lambda:
	./gradlew build -Dquarkus.native.enabled=true -Dquarkus.native.container-build=true -x test

# Build UI for production
build-ui:
	cd ui && npm run build

# Deploy UI to S3 and invalidate CloudFront cache
deploy-ui:
	@echo "Deploying UI to S3..."
	cd terraform/environments/dev && \
		eval "$$(aws configure export-credentials --format env)" && \
		BUCKET=$$(terraform output -raw frontend_bucket) && \
		DIST_ID=$$(terraform output -raw cloudfront_distribution_id) && \
		aws s3 sync ../../ui/dist "s3://$$BUCKET" --delete && \
		aws cloudfront create-invalidation --distribution-id "$$DIST_ID" --paths "/*"

# Apply Terraform infrastructure changes
deploy-infra:
	cd terraform/environments/dev && \
		eval "$$(aws configure export-credentials --format env)" && \
		terraform apply

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
