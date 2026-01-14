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
    name = "author"
    type = "S"
  }

  attribute {
    name = "genre"
    type = "S"
  }

  attribute {
    name = "source"
    type = "S"
  }

  attribute {
    name = "gsiPartition"
    type = "S"
  }

  attribute {
    name = "lengthCategory"
    type = "S"
  }

  attribute {
    name = "rating"
    type = "N"
  }

  attribute {
    name = "numRatings"
    type = "N"
  }

  attribute {
    name = "narrator"
    type = "S"
  }

  # GSI 1: Query by author, sorted by rating (descending)
  global_secondary_index {
    name            = "author-index"
    hash_key        = "author"
    range_key       = "rating"
    projection_type = "ALL"
  }

  # GSI 2: Query by genre, sorted by numRatings (popularity)
  global_secondary_index {
    name            = "genre-index"
    hash_key        = "genre"
    range_key       = "numRatings"
    projection_type = "ALL"
  }

  # GSI 3: Query all books sorted by popularity (numRatings)
  # Uses fixed partition key "BOOK" to enable global sorting
  global_secondary_index {
    name            = "popularity-index"
    hash_key        = "gsiPartition"
    range_key       = "numRatings"
    projection_type = "ALL"
  }

  # GSI 4: Query by length category, sorted by rating
  global_secondary_index {
    name            = "length-index"
    hash_key        = "lengthCategory"
    range_key       = "rating"
    projection_type = "ALL"
  }

  # GSI 5: Query by narrator, sorted by rating (descending)
  global_secondary_index {
    name            = "narrator-index"
    hash_key        = "narrator"
    range_key       = "rating"
    projection_type = "ALL"
  }

  # GSI 6: Query by source (AUDIBLE or ROYAL_ROAD), sorted by rating
  global_secondary_index {
    name            = "source-index"
    hash_key        = "source"
    range_key       = "rating"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = var.enable_pitr
  }

  tags = {
    Name = var.table_name
  }
}
