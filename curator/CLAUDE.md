# Curator CLI

Command-line tool for managing the LitRPG book catalog. Run `make help` for all commands.

## Architecture

```
curator/src/main/kotlin/org/jcjolley/curator/
├── commands/    # Clikt subcommands
├── repository/  # DynamoDB persistence
├── scraper/     # Audible HTML parsing (SkrapeIt)
├── llm/         # Ollama integration
└── model/       # Book, ScrapedBook, BookFacts
```

## Two-Pass LLM Summarization

1. **Extract facts**: Parse Audible description into structured `BookFacts`
2. **Generate blurb**: Create concise 2-sentence summary (30-70 words)

## Data Model Flow

`ScrapedBook` (raw Audible) → `Book` (domain model with metrics) → `BookEntity` (DynamoDB bean)

Use extension functions for conversions: `book.toEntity()`, `entity.toBook()`

## Testing

Uses Testcontainers with DynamoDB Local. See `BookRepositoryTest.kt` for pattern.
