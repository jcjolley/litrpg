package org.jcjolley.curator.commands

import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.parameters.options.default
import com.github.ajalt.clikt.parameters.options.flag
import com.github.ajalt.clikt.parameters.options.option
import com.github.ajalt.clikt.parameters.types.int
import com.github.ajalt.clikt.parameters.types.long
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import org.jcjolley.curator.llm.LlamaSummarizer
import org.jcjolley.curator.llm.OllamaClient
import org.jcjolley.curator.llm.VALID_GENRES
import org.jcjolley.curator.repository.BookRepository
import org.jcjolley.curator.scraper.AudibleScraper
import org.jcjolley.curator.scraper.RoyalRoadScraper
import java.time.Instant

/**
 * Migrate existing books to the new multi-genre system.
 * Re-scrapes source URLs and uses a focused genre-only LLM prompt to assign 1-5 genres.
 */
class MigrateGenresCommand : CliktCommand(name = "migrate-genres") {
    override fun help(context: com.github.ajalt.clikt.core.Context) =
        "Migrate all books to multi-genre classification (1-5 genres per book)"

    private val dryRun by option("--dry-run", help = "Preview changes without saving")
        .flag(default = false)

    private val force by option("--force", help = "Re-migrate all books, even those with genres already")
        .flag(default = false)

    private val batchSize by option("--batch", help = "Number of books to process in each batch")
        .int()
        .default(10)

    private val delayMs by option("--delay", help = "Delay between requests in milliseconds")
        .long()
        .default(1000L)

    private val dynamoEndpoint by option("--dynamo", help = "DynamoDB endpoint")

    private val ollamaEndpoint by option("--ollama", help = "Ollama endpoint URL")
        .default("http://localhost:11434")

    private val ollamaModel by option("--model", help = "Ollama model to use")
        .default("llama3.2:latest")

    override fun run() = runBlocking {
        val repository = BookRepository(dynamoEndpoint)
        val audibleScraper = AudibleScraper()
        val royalRoadScraper = RoyalRoadScraper()
        val ollamaClient = OllamaClient(ollamaEndpoint, ollamaModel)
        val summarizer = LlamaSummarizer(ollamaClient)

        try {
            // Ensure table exists (for local/test setup)
            if (dynamoEndpoint != null) {
                repository.createTableIfNotExists()
            }

            val allBooks = repository.findAll()
            echo("Found ${allBooks.size} books total")

            // Filter to books needing migration
            val booksToMigrate = if (force) {
                allBooks
            } else {
                allBooks.filter { it.genres.isEmpty() }
            }

            if (booksToMigrate.isEmpty()) {
                echo(yellow("No books need genre migration"))
                return@runBlocking
            }

            echo("${booksToMigrate.size} books need genre migration")
            if (dryRun) {
                echo(yellow("DRY RUN - no changes will be saved"))
            }
            echo("")

            var updated = 0
            var skipped = 0
            var failed = 0

            for ((index, book) in booksToMigrate.withIndex()) {
                val progress = "[${index + 1}/${booksToMigrate.size}]"
                echo("$progress ${book.title}")

                try {
                    // Determine source and scrape fresh description
                    val description = when {
                        book.audibleUrl != null -> {
                            echo("  Fetching from Audible...")
                            audibleScraper.scrapeBook(book.audibleUrl!!).originalDescription
                        }
                        book.royalRoadUrl != null -> {
                            echo("  Fetching from Royal Road...")
                            val scraped = royalRoadScraper.scrapeBook(book.royalRoadUrl!!)
                            // Include tags in the description for better genre classification
                            val tagsContext = if (scraped.tags.isNotEmpty()) {
                                "\n\nTags: ${scraped.tags.joinToString(", ")}"
                            } else ""
                            scraped.originalDescription + tagsContext
                        }
                        else -> {
                            echo("  ${yellow("⚠")} Skipped (no source URL)")
                            skipped++
                            continue
                        }
                    }

                    // Extract genres using the LLM
                    echo("  Extracting genres via LLM...")
                    val result = summarizer.summarize(description)
                    val genres = result.facts.genres

                    if (genres.isEmpty()) {
                        echo("  ${yellow("⚠")} No genres extracted")
                        failed++
                        continue
                    }

                    // Validate genres
                    val invalidGenres = genres.filter { it !in VALID_GENRES }
                    if (invalidGenres.isNotEmpty()) {
                        echo("  ${yellow("⚠")} Invalid genres: ${invalidGenres.joinToString()}")
                        failed++
                        continue
                    }

                    echo("  ${green("✓")} Genres: ${genres.joinToString(", ")}")

                    if (!dryRun) {
                        val updatedBook = book.copy(
                            genres = genres,
                            updatedAt = Instant.now()
                        )
                        repository.save(updatedBook)
                        echo("  ${green("✓")} Saved")
                    }
                    updated++

                } catch (e: Exception) {
                    echo("  ${red("✗")} Failed: ${e.message}")
                    failed++
                }

                // Rate limit between requests (except for the last one)
                if (index < booksToMigrate.size - 1 && delayMs > 0) {
                    delay(delayMs)
                }

                // Progress summary every batch
                if ((index + 1) % batchSize == 0) {
                    echo("")
                    echo(dim("Progress: ${index + 1}/${booksToMigrate.size} (${updated} updated, ${failed} failed, ${skipped} skipped)"))
                    echo("")
                }
            }

            echo("")
            echo("─".repeat(50))
            echo("Migration complete:")
            echo("  ${green("✓")} Updated: $updated")
            echo("  ${yellow("⊘")} Skipped: $skipped")
            if (failed > 0) {
                echo("  ${red("✗")} Failed: $failed")
            }
            if (dryRun) {
                echo("")
                echo("${yellow("Note:")} This was a dry run. No changes were saved.")
                echo("Run without --dry-run to apply changes.")
            }

        } finally {
            audibleScraper.close()
            royalRoadScraper.close()
            ollamaClient.close()
            repository.close()
        }
    }

    // ANSI color helpers
    private fun green(text: String) = "\u001B[32m$text\u001B[0m"
    private fun yellow(text: String) = "\u001B[33m$text\u001B[0m"
    private fun red(text: String) = "\u001B[31m$text\u001B[0m"
    private fun dim(text: String) = "\u001B[2m$text\u001B[0m"
}
