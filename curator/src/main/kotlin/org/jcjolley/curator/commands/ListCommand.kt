package org.jcjolley.curator.commands

import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.parameters.options.default
import com.github.ajalt.clikt.parameters.options.flag
import com.github.ajalt.clikt.parameters.options.option
import org.jcjolley.curator.repository.BookRepository

class ListCommand : CliktCommand(
    name = "list",
    help = "List all books in the catalog"
) {
    private val dynamoEndpoint by option("--dynamo", help = "DynamoDB endpoint (local testing)")

    private val verbose by option("-v", "--verbose", help = "Show full details")
        .flag(default = false)

    override fun run() {
        val repository = BookRepository(dynamoEndpoint)

        try {
            val books = repository.findAll()

            if (books.isEmpty()) {
                echo("No books in catalog.")
                return
            }

            echo("Found ${books.size} book(s):")
            echo("")

            books.sortedBy { it.title }.forEach { book ->
                if (verbose) {
                    echo("─".repeat(60))
                    echo("ID:       ${book.id}")
                    echo("Title:    ${book.title}")
                    if (book.subtitle != null) {
                        echo("Subtitle: ${book.subtitle}")
                    }
                    echo("Author:   ${book.author}")
                    if (book.series != null) {
                        val pos = book.seriesPosition?.let { " #$it" } ?: ""
                        echo("Series:   ${book.series}$pos")
                    }
                    echo("Rating:   ${book.rating} (${formatNumber(book.numRatings)} ratings)")
                    echo("Length:   ${book.length}")
                    echo("ASIN:     ${book.audibleAsin}")
                    echo("")
                    echo("Description:")
                    echo(book.description)
                    echo("")
                    echo("Metrics: ${book.impressionCount} impressions, ${book.clickThroughCount} clicks, " +
                            "${book.wishlistCount} wishlists, ${book.notInterestedCount} dismissals")
                    echo("")
                } else {
                    val series = book.series?.let { " (${it}${book.seriesPosition?.let { p -> " #$p" } ?: ""})" } ?: ""
                    echo("• ${book.title}$series - ${book.author}")
                    echo("  Rating: ${book.rating} | ${book.length} | ID: ${book.id.take(8)}...")
                }
            }

            if (!verbose) {
                echo("")
                echo("Use --verbose for full details")
            }

        } finally {
            repository.close()
        }
    }

    private fun formatNumber(n: Int): String {
        return String.format("%,d", n)
    }
}
