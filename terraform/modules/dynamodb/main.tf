resource "aws_dynamodb_table" "books" {
  name         = var.table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  # Primary key
  attribute {
    name = "id"
    type = "S"
  }

  # Attributes for GSIs
  attribute {
    name = "audibleUrl"
    type = "S"
  }

  attribute {
    name = "royalRoadUrl"
    type = "S"
  }

  attribute {
    name = "gsiPartition"
    type = "S"
  }

  attribute {
    name = "addedAt"
    type = "N"
  }

  # GSI 1: Lookup by Audible URL (for upsert)
  global_secondary_index {
    name            = "audibleUrl-index"
    hash_key        = "audibleUrl"
    projection_type = "ALL"
  }

  # GSI 2: Lookup by Royal Road URL (for upsert)
  global_secondary_index {
    name            = "royalRoadUrl-index"
    hash_key        = "royalRoadUrl"
    projection_type = "ALL"
  }

  # GSI 3: Query books by addedAt timestamp for incremental sync
  global_secondary_index {
    name            = "addedAt-index"
    hash_key        = "gsiPartition"
    range_key       = "addedAt"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = var.enable_pitr
  }

  tags = {
    Name = var.table_name
  }
}

# Announcements table - simple structure for app updates/news
resource "aws_dynamodb_table" "announcements" {
  name         = "${var.table_name}-announcements"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  # No GSIs needed - small dataset, scan is fine

  point_in_time_recovery {
    enabled = var.enable_pitr
  }

  tags = {
    Name = "${var.table_name}-announcements"
  }
}
