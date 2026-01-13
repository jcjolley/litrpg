package org.jcjolley.curator.commands

import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.parameters.arguments.argument
import com.github.ajalt.clikt.parameters.arguments.optional
import com.github.ajalt.clikt.parameters.options.default
import com.github.ajalt.clikt.parameters.options.flag
import com.github.ajalt.clikt.parameters.options.option
import com.github.ajalt.clikt.parameters.types.long
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import org.jcjolley.curator.model.Book
import org.jcjolley.curator.repository.BookRepository
import org.jcjolley.curator.scraper.AudibleScraper
import java.time.Instant

class RefreshCommand : CliktCommand(name = "refresh") {
    override fun help(context: com.github.ajalt.clikt.core.Context) =
        "Re-scrape books from Audible to update narrator and other scraped data"

    private val bookId by argument(help = "Book ID to refresh (optional, refreshes all if not specified)")
        .optional()

    private val missingNarrator by option("--missing-narrator", help = "Only refresh books missing narrator data")
        .flag(default = false)

    private val dryRun by option("--dry-run", help = "Preview changes without saving")
        .flag(default = false)

    private val delayMs by option("--delay", help = "Delay between requests in milliseconds")
        .long()
        .default(1000L)

    private val dynamoEndpoint by option("--dynamo", help = "DynamoDB endpoint (local testing)")

    override fun run() = runBlocking {
        val repository = BookRepository(dynamoEndpoint)
        val scraper = AudibleScraper()

        try {
            // Ensure table exists (for local/test setup)
            if (dynamoEndpoint != null) {
                repository.createTableIfNotExists()
            }

            // Get books to refresh
            val booksToRefresh = when {
                bookId != null -> {
                    val book = repository.findById(bookId!!)
                    if (book == null) {
                        echo(red("Book not found: $bookId"))
                        return@runBlocking
                    }
                    listOf(book)
                }
                missingNarrator -> {
                    repository.findAll().filter { it.narrator == null }
                }
                else -> {
                    repository.findAll()
                }
            }

            if (booksToRefresh.isEmpty()) {
                echo(yellow("No books to refresh"))
                return@runBlocking
            }

            echo("Found ${booksToRefresh.size} book(s) to refresh")
            if (dryRun) {
                echo(yellow("DRY RUN - no changes will be saved"))
            }
            echo("")

            var updated = 0
            var failed = 0
            var skipped = 0

            for ((index, book) in booksToRefresh.withIndex()) {
                echo("[${index + 1}/${booksToRefresh.size}] ${book.title}")

                try {
                    // Re-scrape the book from Audible
                    val scraped = scraper.scrapeBook(book.audibleUrl)

                    // Check what changed
                    val changes = mutableListOf<String>()

                    if (book.narrator != scraped.narrator) {
                        changes.add("narrator: ${book.narrator ?: "(none)"} -> ${scraped.narrator ?: "(none)"}")
                    }
                    if (book.rating != scraped.rating) {
                        changes.add("rating: ${book.rating} -> ${scraped.rating}")
                    }
                    if (book.numRatings != scraped.numRatings) {
                        changes.add("numRatings: ${book.numRatings} -> ${scraped.numRatings}")
                    }

                    if (changes.isEmpty()) {
                        echo("  ${dim("No changes detected")}")
                        skipped++
                    } else {
                        changes.forEach { echo("  ${green("+")} $it") }

                        if (!dryRun) {
                            // Update the book with new scraped data
                            val updatedBook = book.copy(
                                narrator = scraped.narrator,
                                rating = scraped.rating,
                                numRatings = scraped.numRatings,
                                updatedAt = Instant.now()
                            )
                            repository.save(updatedBook)
                            echo("  ${green("✓")} Saved")
                        }
                        updated++
                    }
                } catch (e: Exception) {
                    echo("  ${red("✗")} Failed: ${e.message}")
                    failed++
                }

                // Rate limit between requests (except for the last one)
                if (index < booksToRefresh.size - 1 && delayMs > 0) {
                    delay(delayMs)
                }
            }

            echo("")
            echo("Summary:")
            echo("  Updated: $updated")
            echo("  Skipped: $skipped (no changes)")
            echo("  Failed: $failed")

        } finally {
            scraper.close()
            repository.close()
        }
    }

    // ANSI color helpers
    private fun green(text: String) = "\u001B[32m$text\u001B[0m"
    private fun yellow(text: String) = "\u001B[33m$text\u001B[0m"
    private fun red(text: String) = "\u001B[31m$text\u001B[0m"
    private fun dim(text: String) = "\u001B[2m$text\u001B[0m"
}
