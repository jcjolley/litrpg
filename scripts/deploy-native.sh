#!/bin/bash
set -e

# Deploy native Lambda container to AWS
# Usage: ./scripts/deploy-native.sh [environment]

ENVIRONMENT=${1:-dev}
AWS_REGION=${AWS_REGION:-us-east-1}
IMAGE_TAG=${IMAGE_TAG:-$(git rev-parse --short HEAD 2>/dev/null || echo "latest")}

echo "=== Deploying LitRPG API (Native) ==="
echo "Environment: $ENVIRONMENT"
echo "Region: $AWS_REGION"
echo "Image Tag: $IMAGE_TAG"
echo ""

# Get ECR repository URL from Terraform
cd terraform/environments/$ENVIRONMENT
ECR_REPO=$(terraform output -raw ecr_repository_url 2>/dev/null || echo "")
if [ -z "$ECR_REPO" ]; then
    echo "Error: ECR repository not found. Run 'terraform apply' first."
    exit 1
fi
cd ../../..

echo "ECR Repository: $ECR_REPO"
echo ""

# Step 1: Build native executable
echo "=== Step 1: Building native executable ==="
./gradlew build -Dquarkus.native.enabled=true -Dquarkus.native.container-build=true
echo ""

# Step 2: Build Docker image
echo "=== Step 2: Building Docker image ==="
docker build -f src/main/docker/Dockerfile.native-lambda -t litrpg-api:$IMAGE_TAG .
docker tag litrpg-api:$IMAGE_TAG $ECR_REPO:$IMAGE_TAG
docker tag litrpg-api:$IMAGE_TAG $ECR_REPO:latest
echo ""

# Step 3: Login to ECR and push
echo "=== Step 3: Pushing to ECR ==="
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $(echo $ECR_REPO | cut -d'/' -f1)
docker push $ECR_REPO:$IMAGE_TAG
docker push $ECR_REPO:latest
echo ""

# Step 4: Update Lambda function
echo "=== Step 4: Updating Lambda function ==="
FUNCTION_NAME=$(cd terraform/environments/$ENVIRONMENT && terraform output -raw lambda_function_name)
aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --image-uri $ECR_REPO:$IMAGE_TAG \
    --region $AWS_REGION

echo ""
echo "=== Deployment complete! ==="
echo "Lambda function '$FUNCTION_NAME' updated with image: $ECR_REPO:$IMAGE_TAG"
