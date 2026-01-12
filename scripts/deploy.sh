#!/bin/bash
#
# Full deployment script for LitRPG infrastructure and application
#
# Usage:
#   ./scripts/deploy.sh              # Build native + deploy all
#   ./scripts/deploy.sh --skip-build # Deploy using existing build
#   ./scripts/deploy.sh --infra-only # Deploy infrastructure only
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT=${ENVIRONMENT:-dev}
AWS_REGION=${AWS_REGION:-us-east-1}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "\n${BLUE}=== $1 ===${NC}"; }

# Parse arguments
INFRA_ONLY=false
SKIP_BUILD=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --infra-only)
            INFRA_ONLY=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            echo "Usage: ./scripts/deploy.sh [--skip-build] [--infra-only]"
            exit 1
            ;;
    esac
done

cd "$PROJECT_DIR"

echo ""
echo "=========================================="
echo "  LitRPG Deployment (ZIP)"
echo "=========================================="
echo "Environment: $ENVIRONMENT"
echo "Region:      $AWS_REGION"
echo "=========================================="
echo ""

# Check prerequisites
check_prerequisites() {
    log_step "Checking Prerequisites"

    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI not found. Install from https://aws.amazon.com/cli/"
        exit 1
    fi

    if ! command -v terraform &> /dev/null; then
        log_error "Terraform not found. Install from https://terraform.io"
        exit 1
    fi

    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured. Run 'aws configure'"
        exit 1
    fi

    local aws_account=$(aws sts get-caller-identity --query Account --output text)
    log_info "AWS Account: $aws_account"
    log_info "Prerequisites OK"
}

# Build native image
build_native() {
    log_step "Building Native Image"

    if [ "$SKIP_BUILD" = true ]; then
        if [ -f "build/function.zip" ]; then
            log_info "Skipping build (--skip-build and function.zip exists)"
            return
        else
            log_warn "function.zip not found, building anyway..."
        fi
    fi

    ./gradlew build -Dquarkus.native.enabled=true -Dquarkus.package.jar.enabled=false --no-daemon

    if [ ! -f "build/function.zip" ]; then
        log_error "Build failed - function.zip not created"
        exit 1
    fi

    local zip_size=$(ls -lh build/function.zip | awk '{print $5}')
    log_info "Native build complete: function.zip ($zip_size)"
}

# Initialize and apply Terraform
deploy_infrastructure() {
    log_step "Deploying Infrastructure"

    cd "$PROJECT_DIR/terraform/environments/$ENVIRONMENT"

    # Initialize
    log_info "Initializing Terraform..."
    terraform init -upgrade

    # Validate
    log_info "Validating configuration..."
    terraform validate

    # Plan
    log_info "Planning changes..."
    terraform plan -out=tfplan

    # Apply
    log_info "Applying changes..."
    terraform apply tfplan
    rm -f tfplan

    cd "$PROJECT_DIR"
    log_info "Infrastructure deployed"
}

# Print deployment outputs
print_outputs() {
    log_step "Deployment Complete"

    cd "$PROJECT_DIR/terraform/environments/$ENVIRONMENT"

    echo ""
    echo "  API Endpoint:    $(terraform output -raw api_endpoint)"
    echo "  Frontend URL:    $(terraform output -raw frontend_url)"
    echo "  DynamoDB Table:  $(terraform output -raw dynamodb_table_name)"
    echo "  Lambda Function: $(terraform output -raw lambda_function_name)"
    echo ""

    local api_url=$(terraform output -raw api_endpoint)
    cd "$PROJECT_DIR"

    log_info "Test the API:"
    echo "  curl ${api_url}/books"
    echo ""
}

# Main
main() {
    check_prerequisites

    if [ "$INFRA_ONLY" = false ]; then
        build_native
    fi

    deploy_infrastructure
    print_outputs
}

main "$@"
