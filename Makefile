# Makefile for LitRPG project
SHELL := /bin/bash

.PHONY: build build-lambda build-ui deploy-ui deploy test test-ui test-all test-class clean aws-login stats stats-local list list-local add remove refresh export-prod import-local setup-local-prod localstack localstack-init localstack-down curator curator-local migrate-genres migrate-genres-local announce announce-local help ship ship-deploy worktree-list worktree-sync worktree-cleanup

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
	bash -c "./gradlew build -Dquarkus.native.enabled=true -Dquarkus.native.container-build=true -x test"

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
	bash -c "./gradlew build -x test"

# Run backend tests (requires LocalStack running)
test: localstack-init
	bash -c "./gradlew test"

# Run UI tests
test-ui:
	cd ui && npm test -- --run

# Run all tests (backend + UI)
test-all: test test-ui

# Run a specific test class
# Usage: make test-class CLASS=BooksQueryTest
test-class: localstack-init
	@if [ -z "$(CLASS)" ]; then \
		echo "Usage: make test-class CLASS=<TestClassName>"; \
		exit 1; \
	fi
	bash -c "./gradlew test --tests '*.$(CLASS)'"

# Start LocalStack and initialize DynamoDB table
localstack-init: localstack
	@echo "Initializing LocalStack DynamoDB..."
	@bash scripts/init-localstack.sh

# Clean build artifacts
clean:
	bash -c "./gradlew clean"
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
		./gradlew :curator:run --args="stats"

# View analytics stats from local DynamoDB (LocalStack)
stats-local:
	./gradlew :curator:run --args="stats --dynamo http://localhost:4566"

# List all books in production
list: aws-login
	eval "$$(aws configure export-credentials --format env)" && \
		AWS_REGION=us-west-2 \
		./gradlew :curator:run --args="list"

# List all books in local DynamoDB
list-local:
	./gradlew :curator:run --args="list --dynamo http://localhost:4566"

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

# Remove a book by ID
# Usage: make remove ID=abc123
remove: aws-login
	@if [ -z "$(ID)" ]; then \
		echo "Usage: make remove ID=<book-id>"; \
		exit 1; \
	fi
	eval "$$(aws configure export-credentials --format env)" && \
		AWS_REGION=us-west-2 \
		./gradlew :curator:run --args="remove $(ID)"

# Refresh a book (re-scrape and update)
# Usage: make refresh ID=abc123
refresh: aws-login
	@if [ -z "$(ID)" ]; then \
		echo "Usage: make refresh ID=<book-id>"; \
		exit 1; \
	fi
	eval "$$(aws configure export-credentials --format env)" && \
		AWS_REGION=us-west-2 \
		./gradlew :curator:run --args="refresh $(ID)"

# Migrate all books to multi-genre classification (production)
migrate-genres: aws-login
	eval "$$(aws configure export-credentials --format env)" && \
		AWS_REGION=us-west-2 \
		./gradlew :curator:run --args="migrate-genres"

# Migrate all books to multi-genre classification (local)
migrate-genres-local:
	./gradlew :curator:run --args="migrate-genres --dynamo http://localhost:4566"

# Create an announcement (production)
# Usage: make announce TITLE="New Feature" BODY="We added dark mode!"
announce: aws-login
	@if [ -z "$(TITLE)" ] || [ -z "$(BODY)" ]; then \
		echo "Usage: make announce TITLE=\"title\" BODY=\"body\""; \
		exit 1; \
	fi
	eval "$$(aws configure export-credentials --format env)" && \
		AWS_REGION=us-west-2 \
		./gradlew :curator:run --args="announce '$(TITLE)' '$(BODY)'"

# Create an announcement (local)
# Usage: make announce-local TITLE="Test" BODY="Testing locally"
announce-local:
	@if [ -z "$(TITLE)" ] || [ -z "$(BODY)" ]; then \
		echo "Usage: make announce-local TITLE=\"title\" BODY=\"body\""; \
		exit 1; \
	fi
	./gradlew :curator:run --args="announce '$(TITLE)' '$(BODY)' --dynamo http://localhost:4566"

# Show all available commands
help:
	@echo "LitRPG Makefile Commands:"
	@echo ""
	@echo "Development:"
	@echo "  make dev              Start local dev environment"
	@echo "  make test             Run backend tests (starts LocalStack if needed)"
	@echo "  make test-ui          Run UI tests"
	@echo "  make test-all         Run all tests (backend + UI)"
	@echo "  make test-class CLASS=<name>  Run single backend test class"
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
	@echo "  make announce TITLE=\"...\" BODY=\"...\"  Create announcement"
	@echo ""
	@echo "Curator (Local):"
	@echo "  make list-local       List books in LocalStack"
	@echo "  make stats-local      View local analytics"
	@echo "  make import-local     Import from data/books-prod.json"
	@echo "  make setup-local-prod Export prod + import to local"
	@echo "  make migrate-genres-local  Migrate local books to multi-genre"
	@echo "  make announce-local TITLE=\"...\" BODY=\"...\"  Create local announcement"
	@echo ""
	@echo "Git Worktree (Multi-Session):"
	@echo "  make ship             Test, merge to main, push, cleanup (run from worktree)"
	@echo "  make ship-deploy      Ship + full deploy to production"
	@echo "  make worktree-list    List all worktrees with status"
	@echo "  make worktree-sync    Rebase current branch onto origin/main"
	@echo "  make worktree-cleanup Remove merged worktrees"

# =============================================================================
# Git Worktree Management (Multi-Session Claude Workflow)
# =============================================================================

# Worktree base directory
WORKTREE_BASE := $(HOME)/.claude-worktrees/litrpg

# List all worktrees with their status
worktree-list:
	@echo "=== Git Worktrees ==="
	@git worktree list
	@echo ""
	@echo "=== Branch Status ==="
	@for wt in $$(git worktree list --porcelain | grep "^worktree" | cut -d' ' -f2); do \
		branch=$$(git -C "$$wt" branch --show-current 2>/dev/null); \
		if [ -n "$$branch" ] && [ "$$branch" != "main" ]; then \
			ahead=$$(git -C "$$wt" rev-list --count origin/main..HEAD 2>/dev/null || echo "?"); \
			behind=$$(git -C "$$wt" rev-list --count HEAD..origin/main 2>/dev/null || echo "?"); \
			echo "  $$branch: +$$ahead/-$$behind commits vs origin/main"; \
		fi; \
	done

# Rebase current branch onto latest origin/main
worktree-sync:
	@if [ "$$(git branch --show-current)" = "main" ]; then \
		echo "Already on main, pulling latest..."; \
		git pull origin main; \
	else \
		echo "Fetching and rebasing onto origin/main..."; \
		git fetch origin main; \
		git rebase origin/main; \
	fi

# Ship: test, merge to main, push, and cleanup worktree
# Run this from a feature worktree when ready to merge
ship:
	@BRANCH=$$(git branch --show-current); \
	WORKTREE_PATH=$$(pwd); \
	MAIN_WORKTREE=$$(git worktree list | grep '\[main\]' | awk '{print $$1}'); \
	if [ "$$BRANCH" = "main" ]; then \
		echo "Error: Already on main. Run this from a feature worktree."; \
		exit 1; \
	fi; \
	echo "=== Shipping $$BRANCH ==="; \
	echo ""; \
	echo "Step 1/6: Checking for uncommitted changes..."; \
	if ! git diff --quiet || ! git diff --cached --quiet; then \
		echo "Error: You have uncommitted changes. Commit or stash them first."; \
		exit 1; \
	fi; \
	echo "Step 2/6: Syncing with origin/main..."; \
	git fetch origin main; \
	if ! git rebase origin/main; then \
		echo "Error: Rebase failed. Resolve conflicts and try again."; \
		exit 1; \
	fi; \
	echo "Step 3/6: Running tests..."; \
	if ! $(MAKE) test-all; then \
		echo "Error: Tests failed. Fix them before shipping."; \
		exit 1; \
	fi; \
	echo "Step 4/6: Merging to main..."; \
	cd "$$MAIN_WORKTREE" && \
	git checkout main && \
	git pull origin main && \
	git merge --ff-only "$$BRANCH"; \
	echo "Step 5/6: Pushing to origin..."; \
	git push origin main; \
	echo "Step 6/6: Cleaning up worktree..."; \
	cd "$$MAIN_WORKTREE" && \
	git branch -d "$$BRANCH" && \
	git worktree remove "$$WORKTREE_PATH"; \
	echo ""; \
	echo "=== $$BRANCH shipped successfully! ==="

# Ship and deploy: test, merge, push, cleanup, then full deploy
ship-deploy: ship deploy
	@echo "=== Deployed to production! ==="

# Clean up worktrees whose branches have been merged to main
worktree-cleanup:
	@echo "=== Cleaning up merged worktrees ==="
	@MAIN_WORKTREE=$$(git worktree list | grep '\[main\]' | awk '{print $$1}'); \
	for wt in $$(git worktree list --porcelain | grep "^worktree" | cut -d' ' -f2); do \
		if [ "$$wt" = "$$MAIN_WORKTREE" ]; then continue; fi; \
		branch=$$(git -C "$$wt" branch --show-current 2>/dev/null); \
		if [ -z "$$branch" ]; then \
			echo "Removing orphaned worktree: $$wt"; \
			git worktree remove --force "$$wt" 2>/dev/null || rm -rf "$$wt"; \
		elif git branch --merged main | grep -q "$$branch"; then \
			if git -C "$$wt" status --porcelain | grep -q .; then \
				echo "Skipping: $$wt ($$branch) - merged but has uncommitted changes"; \
			else \
				echo "Removing merged worktree: $$wt ($$branch)"; \
				git worktree remove "$$wt" && git branch -d "$$branch"; \
			fi; \
		else \
			echo "Keeping: $$wt ($$branch) - not yet merged"; \
		fi; \
	done; \
	git worktree prune; \
	echo "Done."
