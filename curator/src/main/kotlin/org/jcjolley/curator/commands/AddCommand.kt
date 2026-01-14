package org.jcjolley.curator.commands

import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.parameters.arguments.argument
import com.github.ajalt.clikt.parameters.options.default
import com.github.ajalt.clikt.parameters.options.flag
import com.github.ajalt.clikt.parameters.options.option
import kotlinx.coroutines.runBlocking
import org.jcjolley.curator.llm.LlamaSummarizer
import org.jcjolley.curator.llm.OllamaClient
import org.jcjolley.curator.llm.SummarizationResult
import org.jcjolley.curator.model.Book
import org.jcjolley.curator.model.BookFacts
import org.jcjolley.curator.model.ScrapedBook
import org.jcjolley.curator.model.ScrapedRoyalRoadBook
import org.jcjolley.curator.repository.BookRepository
import org.jcjolley.curator.scraper.AudibleScraper
import org.jcjolley.curator.scraper.RoyalRoadScraper
import org.jcjolley.curator.util.LengthParser
import java.time.Instant
import java.util.*

class AddCommand : CliktCommand(name = "add") {
    override fun help(context: com.github.ajalt.clikt.core.Context) =
        "Add a book to the catalog by Audible or Royal Road URL"

    private val url by argument(help = "Audible or Royal Road URL")

    private val interactive by option("-i", "--interactive", "--no-interactive", help = "Interactive mode for review/edit")
        .flag("--no-interactive", default = true)

    private val autoAccept by option("-y", "--yes", help = "Automatically accept the generated description")
        .flag(default = false)

    private val ollamaEndpoint by option("--ollama", help = "Ollama endpoint URL")
        .default("http://localhost:11434")

    private val ollamaModel by option("--model", help = "Ollama model to use")
        .default("llama3.2:latest")

    private val dynamoEndpoint by option("--dynamo", help = "DynamoDB endpoint (local testing)")

    private enum class Source { AUDIBLE, ROYAL_ROAD }

    private fun detectSource(url: String): Source {
        return when {
            url.contains("audible.com") -> Source.AUDIBLE
            url.contains("royalroad.com") -> Source.ROYAL_ROAD
            else -> throw IllegalArgumentException("Unsupported URL. Must be from audible.com or royalroad.com")
        }
    }

    override fun run() = runBlocking {
        echo("Adding book from: $url")
        echo("")

        val source = detectSource(url)
        val audibleScraper = if (source == Source.AUDIBLE) AudibleScraper() else null
        val royalRoadScraper = if (source == Source.ROYAL_ROAD) RoyalRoadScraper() else null
        val ollamaClient = OllamaClient(ollamaEndpoint, ollamaModel)
        val summarizer = LlamaSummarizer(ollamaClient)
        val repository = BookRepository(dynamoEndpoint)

        try {
            // Ensure table exists (for local/test setup)
            if (dynamoEndpoint != null) {
                repository.createTableIfNotExists()
            }

            // Step 1: Scrape the page based on source
            val originalDescription: String
            val book: Book

            when (source) {
                Source.AUDIBLE -> {
                    echo("Scraping Audible page...")
                    val scraped = audibleScraper!!.scrapeBook(url)
                    displayScrapedAudibleInfo(scraped)
                    originalDescription = scraped.originalDescription

                    // Step 2: Generate description via Llama
                    echo("")
                    echo("Generating description via Llama...")
                    var result = summarizer.summarize(originalDescription)
                    displaySummarizationResult(result)

                    // Step 3: Interactive review (if enabled and not auto-accept)
                    var finalDescription = result.blurb
                    var finalFacts = result.facts
                    if (interactive && !autoAccept) {
                        val reviewResult = interactiveReviewWithFacts(result, summarizer, originalDescription)
                        finalDescription = reviewResult.first
                        finalFacts = reviewResult.second
                    }

                    book = createAudibleBook(scraped, finalDescription, finalFacts)
                }

                Source.ROYAL_ROAD -> {
                    echo("Scraping Royal Road page...")
                    val scraped = royalRoadScraper!!.scrapeBook(url)
                    displayScrapedRoyalRoadInfo(scraped)
                    originalDescription = scraped.originalDescription

                    // Step 2: Generate description via Llama
                    echo("")
                    echo("Generating description via Llama...")
                    var result = summarizer.summarize(originalDescription)
                    displaySummarizationResult(result)

                    // Step 3: Interactive review (if enabled and not auto-accept)
                    var finalDescription = result.blurb
                    var finalFacts = result.facts
                    if (interactive && !autoAccept) {
                        val reviewResult = interactiveReviewWithFacts(result, summarizer, originalDescription)
                        finalDescription = reviewResult.first
                        finalFacts = reviewResult.second
                    }

                    book = createRoyalRoadBook(scraped, finalDescription, finalFacts)
                }
            }

            // Step 4: Save book
            repository.save(book)

            echo("")
            echo(green("✓ Book added to catalog (ID: ${book.id})"))

        } finally {
            audibleScraper?.close()
            royalRoadScraper?.close()
            ollamaClient.close()
            repository.close()
        }
    }

    private fun displayScrapedAudibleInfo(scraped: ScrapedBook) {
        echo(green("✓") + " Title: ${scraped.title}")
        if (scraped.subtitle != null) {
            echo(green("✓") + " Subtitle: ${scraped.subtitle}")
        }
        echo(green("✓") + " Author: ${scraped.author}")
        if (scraped.narrator != null) {
            echo(green("✓") + " Narrator: ${scraped.narrator}")
        }
        if (scraped.series != null) {
            val position = scraped.seriesPosition?.let { ", Book $it" } ?: ""
            echo(green("✓") + " Series: ${scraped.series}$position")
        }
        echo(green("✓") + " Rating: ${scraped.rating} (${formatNumber(scraped.numRatings)} ratings)")
        echo(green("✓") + " Length: ${scraped.length}")
        echo(green("✓") + " ASIN: ${scraped.audibleAsin}")
    }

    private fun displayScrapedRoyalRoadInfo(scraped: ScrapedRoyalRoadBook) {
        echo(green("✓") + " Title: ${scraped.title}")
        echo(green("✓") + " Author: ${scraped.author}")
        echo(green("✓") + " Rating: ${scraped.rating} (${formatNumber(scraped.numRatings)} ratings)")
        echo(green("✓") + " Pages: ${formatNumber(scraped.pageCount)}")
        echo(green("✓") + " Chapters: ${formatNumber(scraped.chapterCount)}")
        echo(green("✓") + " Followers: ${formatNumber(scraped.followers)}")
        if (scraped.tags.isNotEmpty()) {
            echo(green("✓") + " Tags: ${scraped.tags.take(5).joinToString(", ")}")
        }
        echo(green("✓") + " ID: ${scraped.royalRoadId}")
    }

    private fun displaySummarizationResult(result: SummarizationResult) {
        echo("───────────────────────────────────────────────────")
        echo(result.blurb)
        echo("───────────────────────────────────────────────────")
        echo("(${result.wordCount} words, genre: ${result.facts.genre ?: "unknown"})")

        if (!result.isValid()) {
            echo("")
            echo(yellow("⚠ Quality issues detected:"))
            result.validationIssues().forEach { echo("  - $it") }
        }
    }

    private suspend fun interactiveReviewWithFacts(
        initialResult: SummarizationResult,
        summarizer: LlamaSummarizer,
        originalDescription: String
    ): Pair<String, BookFacts> {
        var currentResult = initialResult
        var currentDescription = currentResult.blurb

        while (true) {
            echo("")
            echo("[A]ccept / [E]dit / [R]egenerate / [C]ancel? ", trailingNewline = false)
            val input = readLine()?.trim()?.lowercase() ?: "c"

            when (input) {
                "a", "accept" -> {
                    return Pair(currentDescription, currentResult.facts)
                }
                "e", "edit" -> {
                    echo("Enter new description (or press Enter to keep current):")
                    val edited = readLine()
                    if (!edited.isNullOrBlank()) {
                        currentDescription = edited
                        echo("")
                        echo("Updated description:")
                        echo("───────────────────────────────────────────────────")
                        echo(currentDescription)
                        echo("───────────────────────────────────────────────────")
                    }
                }
                "r", "regenerate" -> {
                    echo("")
                    echo("Regenerating description...")
                    currentResult = summarizer.summarize(originalDescription)
                    currentDescription = currentResult.blurb
                    displaySummarizationResult(currentResult)
                }
                "c", "cancel" -> {
                    echo(red("Cancelled. Book not added."))
                    throw CanceledException()
                }
                else -> {
                    echo("Invalid option. Please enter A, E, R, or C.")
                }
            }
        }
    }

    private fun createAudibleBook(scraped: ScrapedBook, description: String, facts: BookFacts): Book {
        val now = Instant.now()
        val lengthMinutes = LengthParser.parseToMinutes(scraped.length)
        val lengthCategory = LengthParser.computeCategory(lengthMinutes)

        return Book(
            id = UUID.randomUUID().toString(),
            title = scraped.title,
            subtitle = scraped.subtitle,
            author = scraped.author,
            authorUrl = scraped.authorUrl,
            narrator = scraped.narrator,
            series = scraped.series,
            seriesPosition = scraped.seriesPosition,
            length = scraped.length,
            releaseDate = scraped.releaseDate,
            language = scraped.language,
            imageUrl = scraped.imageUrl,
            source = "AUDIBLE",
            audibleUrl = scraped.audibleUrl,
            audibleAsin = scraped.audibleAsin,
            rating = scraped.rating,
            numRatings = scraped.numRatings,
            description = description,
            // GSI filter fields
            genre = facts.genre,
            lengthMinutes = lengthMinutes,
            lengthCategory = lengthCategory,
            addedAt = now,
            updatedAt = now
        )
    }

    private fun createRoyalRoadBook(scraped: ScrapedRoyalRoadBook, description: String, facts: BookFacts): Book {
        val now = Instant.now()

        return Book(
            id = UUID.randomUUID().toString(),
            title = scraped.title,
            author = scraped.author,
            authorUrl = scraped.authorUrl,
            imageUrl = scraped.imageUrl,
            source = "ROYAL_ROAD",
            royalRoadUrl = scraped.royalRoadUrl,
            royalRoadId = scraped.royalRoadId,
            rating = scraped.rating,
            numRatings = scraped.numRatings,
            pageCount = scraped.pageCount,
            description = description,
            // GSI filter fields
            genre = facts.genre,
            addedAt = now,
            updatedAt = now
        )
    }

    private fun formatNumber(n: Int): String {
        return String.format("%,d", n)
    }

    // ANSI color helpers
    private fun green(text: String) = "\u001B[32m$text\u001B[0m"
    private fun yellow(text: String) = "\u001B[33m$text\u001B[0m"
    private fun red(text: String) = "\u001B[31m$text\u001B[0m"
}

class CanceledException : Exception("Operation cancelled by user")
