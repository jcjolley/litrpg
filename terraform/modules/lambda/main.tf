# IAM Role for Lambda execution
resource "aws_iam_role" "lambda_exec" {
  name = "${var.function_name}-exec-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

# CloudWatch Logs policy
resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# DynamoDB access policy (least privilege)
resource "aws_iam_role_policy" "dynamodb_access" {
  name = "${var.function_name}-dynamodb-policy"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "dynamodb:GetItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem"
      ]
      Resource = [
        var.dynamodb_table_arn,
        "${var.dynamodb_table_arn}/index/*"
      ]
    }]
  })
}

# Lambda function - Supports both ZIP and Container deployment
resource "aws_lambda_function" "api" {
  function_name = var.function_name
  role          = aws_iam_role.lambda_exec.arn
  architectures = ["x86_64"]

  # ZIP deployment (simpler, no ECR needed)
  package_type = var.deployment_type == "zip" ? "Zip" : "Image"
  filename     = var.deployment_type == "zip" ? var.zip_file_path : null
  handler      = var.deployment_type == "zip" ? "not.used.in" : null  # Required but not used by native
  runtime      = var.deployment_type == "zip" ? "provided.al2023" : null

  # Container deployment (for larger images or more control)
  image_uri = var.deployment_type == "container" ? var.container_image_uri : null

  # Use file hash to trigger updates when ZIP changes
  source_code_hash = var.deployment_type == "zip" && var.zip_file_path != null ? filebase64sha256(var.zip_file_path) : null

  memory_size = var.memory_size
  timeout     = var.timeout

  environment {
    variables = {
      DYNAMODB_TABLE_NAME     = var.dynamodb_table_name
      QUARKUS_PROFILE         = var.environment
      DISABLE_SIGNAL_HANDLERS = "true"
    }
  }

  tags = {
    Name = var.function_name
  }
}

# Lambda permission for API Gateway
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.api_gateway_execution_arn}/*/*"
}
