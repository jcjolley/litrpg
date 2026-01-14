package org.jcjolley.curator.commands

import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.parameters.arguments.argument
import com.github.ajalt.clikt.parameters.options.default
import com.github.ajalt.clikt.parameters.options.flag
import com.github.ajalt.clikt.parameters.options.option
import kotlinx.coroutines.runBlocking
import org.jcjolley.curator.llm.LlamaSummarizer
import org.jcjolley.curator.llm.OllamaClient
import org.jcjolley.curator.repository.BookRepository
import org.jcjolley.curator.scraper.AudibleScraper
import java.time.Instant

class UpdateCommand : CliktCommand(name = "update") {
    override fun help(context: com.github.ajalt.clikt.core.Context) =
        "Update a book's metadata by re-scraping Audible"

    private val bookId by argument(help = "Book ID to update")

    private val rescrape by option("--rescrape", help = "Re-scrape Audible page for updated metadata")
        .flag(default = false)

    private val regenerate by option("--regenerate", help = "Regenerate description via Llama")
        .flag(default = false)

    private val dynamoEndpoint by option("--dynamo", help = "DynamoDB endpoint (local testing)")

    private val ollamaEndpoint by option("--ollama", help = "Ollama endpoint URL")
        .default("http://localhost:11434")

    private val ollamaModel by option("--model", help = "Ollama model to use")
        .default("llama3.2:latest")

    override fun run() = runBlocking {
        val repository = BookRepository(dynamoEndpoint)

        try {
            val existingBook = repository.findById(bookId)

            if (existingBook == null) {
                echo(red("Book not found: $bookId"))
                return@runBlocking
            }

            echo("Found book: ${existingBook.title}")
            echo("")

            var updatedBook = existingBook.copy(updatedAt = Instant.now())

            // Re-scrape if requested (Audible only)
            if (rescrape) {
                if (existingBook.audibleUrl == null) {
                    echo(yellow("⚠ Cannot rescrape: not an Audible book"))
                } else {
                    echo("Re-scraping Audible page...")
                    val scraper = AudibleScraper()
                    try {
                        val scraped = scraper.scrapeBook(existingBook.audibleUrl)
                        updatedBook = updatedBook.copy(
                            title = scraped.title,
                            subtitle = scraped.subtitle,
                            author = scraped.author,
                            authorUrl = scraped.authorUrl,
                            series = scraped.series,
                            seriesPosition = scraped.seriesPosition,
                            length = scraped.length,
                            releaseDate = scraped.releaseDate,
                            language = scraped.language,
                            imageUrl = scraped.imageUrl,
                            rating = scraped.rating,
                            numRatings = scraped.numRatings
                        )
                        echo(green("✓") + " Metadata updated from Audible")
                    } finally {
                        scraper.close()
                    }
                }
            }

            // Regenerate description if requested (Audible only - needs to re-scrape)
            if (regenerate) {
                if (existingBook.audibleUrl == null) {
                    echo(yellow("⚠ Cannot regenerate: not an Audible book (cannot fetch original description)"))
                } else {
                    echo("Regenerating description via Llama...")
                    val scraper = AudibleScraper()
                    val ollamaClient = OllamaClient(ollamaEndpoint, ollamaModel)
                    val summarizer = LlamaSummarizer(ollamaClient)

                    try {
                        // Need to re-scrape to get original description
                        val scraped = scraper.scrapeBook(existingBook.audibleUrl)
                        val result = summarizer.summarize(scraped.originalDescription)

                        echo("───────────────────────────────────────────────────")
                        echo("Old: ${existingBook.description}")
                        echo("")
                        echo("New: ${result.blurb}")
                        echo("───────────────────────────────────────────────────")

                        echo("")
                        echo("Accept new description? [y/N] ", trailingNewline = false)
                        val input = readLine()?.trim()?.lowercase()

                        if (input == "y" || input == "yes") {
                            updatedBook = updatedBook.copy(description = result.blurb)
                            echo(green("✓") + " Description updated")
                        } else {
                            echo("Description unchanged")
                        }
                    } finally {
                        scraper.close()
                        ollamaClient.close()
                    }
                }
            }

            // Save updates
            if (updatedBook != existingBook) {
                repository.save(updatedBook)
                echo("")
                echo(green("✓ Book updated successfully"))
            } else {
                echo("No changes made. Use --rescrape or --regenerate to update.")
            }

        } finally {
            repository.close()
        }
    }

    private fun green(text: String) = "\u001B[32m$text\u001B[0m"
    private fun yellow(text: String) = "\u001B[33m$text\u001B[0m"
    private fun red(text: String) = "\u001B[31m$text\u001B[0m"
}
