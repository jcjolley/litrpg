package org.jcjolley.curator.commands

import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.parameters.options.default
import com.github.ajalt.clikt.parameters.options.flag
import com.github.ajalt.clikt.parameters.options.option
import kotlinx.coroutines.runBlocking
import org.jcjolley.curator.llm.LlamaSummarizer
import org.jcjolley.curator.llm.OllamaClient
import org.jcjolley.curator.repository.BookRepository
import org.jcjolley.curator.scraper.AudibleScraper
import org.jcjolley.curator.util.LengthParser
import java.time.Instant

/**
 * Migrate existing books to add new GSI filter fields.
 *
 * @param repositoryProvider Optional factory for BookRepository (for testing)
 * @param scraperProvider Optional factory for AudibleScraper (for testing)
 * @param summarizerProvider Optional factory for LlamaSummarizer (for testing)
 */
class MigrateCommand(
    private val repositoryProvider: ((String?) -> BookRepository)? = null,
    private val scraperProvider: (() -> AudibleScraper)? = null,
    private val summarizerProvider: ((String, String) -> LlamaSummarizer)? = null
) : CliktCommand(name = "migrate") {
    override fun help(context: com.github.ajalt.clikt.core.Context) =
        "Migrate existing books to add new filter fields (genre, length, gsiPartition)"

    private val dryRun by option("--dry-run", help = "Preview changes without saving")
        .flag(default = false)

    private val skipLlm by option("--skip-llm", help = "Only update length fields, skip LLM re-extraction")
        .flag(default = false)

    private val force by option("--force", help = "Re-migrate all books, even if already migrated")
        .flag(default = false)

    private val dynamoEndpoint by option("--dynamo", help = "DynamoDB endpoint")

    private val ollamaEndpoint by option("--ollama", help = "Ollama endpoint URL")
        .default("http://localhost:11434")

    private val ollamaModel by option("--model", help = "Ollama model to use")
        .default("llama3.2:latest")

    override fun run() = runBlocking {
        val repository = repositoryProvider?.invoke(dynamoEndpoint) ?: BookRepository(dynamoEndpoint)
        val scraper = if (!skipLlm) {
            scraperProvider?.invoke() ?: AudibleScraper()
        } else null
        val summarizer = if (!skipLlm) {
            summarizerProvider?.invoke(ollamaEndpoint, ollamaModel)
                ?: LlamaSummarizer(OllamaClient(ollamaEndpoint, ollamaModel))
        } else null

        try {
            val books = repository.findAll()
            echo("Found ${books.size} books to migrate")
            echo("")

            var updated = 0
            var skipped = 0
            var failed = 0

            for (book in books) {
                // Skip if already fully migrated (has all new fields) unless --force is used
                val isFullyMigrated = book.lengthMinutes != null &&
                    book.lengthCategory != null &&
                    book.genre != null &&
                    book.gsiPartition == "BOOK"

                if (isFullyMigrated && !force) {
                    echo("${yellow("⊘")} Skipping ${book.title} (already migrated)")
                    skipped++
                    continue
                }

                echo("Processing: ${book.title}")

                // Always compute length fields from existing length string (Audible only)
                val lengthMinutes = book.length?.let { LengthParser.parseToMinutes(it) }
                val lengthCategory = LengthParser.computeCategory(lengthMinutes)

                var genre = book.genre

                // Re-extract via LLM if needed and not skipping (Audible only)
                if (!skipLlm && scraper != null && summarizer != null && genre == null && book.audibleUrl != null) {
                    try {
                        echo("  Fetching from Audible...")
                        val scraped = scraper.scrapeBook(book.audibleUrl!!)
                        echo("  Extracting facts via LLM...")
                        val result = summarizer.summarize(scraped.originalDescription)
                        genre = result.facts.genre
                        echo("  ${green("✓")} Extracted: genre=$genre")
                    } catch (e: Exception) {
                        echo("  ${yellow("⚠")} LLM extraction failed: ${e.message}")
                    }
                }

                val updatedBook = book.copy(
                    lengthMinutes = lengthMinutes,
                    lengthCategory = lengthCategory,
                    genre = genre,
                    gsiPartition = "BOOK",
                    updatedAt = Instant.now()
                )

                if (!dryRun) {
                    try {
                        repository.save(updatedBook)
                        echo("  ${green("✓")} Updated: $lengthCategory ($lengthMinutes min), genre=$genre")
                        updated++
                    } catch (e: Exception) {
                        echo("  ${red("✗")} Failed to save: ${e.message}")
                        failed++
                    }
                } else {
                    echo("  ${blue("[DRY RUN]")} Would update: $lengthCategory ($lengthMinutes min), genre=$genre")
                    updated++
                }
                echo("")
            }

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
            repository.close()
            scraper?.close()
        }
    }

    // ANSI color helpers
    private fun green(text: String) = "\u001B[32m$text\u001B[0m"
    private fun yellow(text: String) = "\u001B[33m$text\u001B[0m"
    private fun red(text: String) = "\u001B[31m$text\u001B[0m"
    private fun blue(text: String) = "\u001B[34m$text\u001B[0m"
}
