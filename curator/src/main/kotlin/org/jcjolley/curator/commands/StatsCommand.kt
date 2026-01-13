package org.jcjolley.curator.commands

import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.parameters.options.default
import com.github.ajalt.clikt.parameters.options.option
import com.github.ajalt.clikt.parameters.types.int
import org.jcjolley.curator.model.Book
import org.jcjolley.curator.repository.BookRepository

class StatsCommand : CliktCommand(name = "stats") {
    override fun help(context: com.github.ajalt.clikt.core.Context) =
        "Show analytics and engagement statistics"

    private val dynamoEndpoint by option("--dynamo", help = "DynamoDB endpoint (local testing)")

    private val top by option("-n", "--top", help = "Number of items in top/bottom lists")
        .int()
        .default(5)

    private val minImpressions by option("--min-impressions", help = "Minimum impressions for rate calculations")
        .int()
        .default(10)

    override fun run() {
        val repository = BookRepository(dynamoEndpoint)

        try {
            val books = repository.findAll()

            if (books.isEmpty()) {
                echo("No books in catalog.")
                return
            }

            printOverallStats(books)
            printTopPerformers(books)
            printNeedsAttention(books)
            printGenreBreakdown(books)

        } finally {
            repository.close()
        }
    }

    private fun printOverallStats(books: List<Book>) {
        val totalImpressions = books.sumOf { it.impressionCount }
        val totalClicks = books.sumOf { it.clickThroughCount }
        val totalWishlists = books.sumOf { it.wishlistCount }
        val totalDismissals = books.sumOf { it.notInterestedCount }

        val overallCtr = if (totalImpressions > 0) totalClicks.toDouble() / totalImpressions * 100 else 0.0
        val overallWishlistRate = if (totalImpressions > 0) totalWishlists.toDouble() / totalImpressions * 100 else 0.0
        val overallDismissalRate = if (totalImpressions > 0) totalDismissals.toDouble() / totalImpressions * 100 else 0.0

        echo("=".repeat(60))
        echo("                    ANALYTICS SUMMARY")
        echo("=".repeat(60))
        echo("")
        echo("Catalog: ${books.size} books")
        echo("")
        echo("--- Totals ---")
        echo("  Impressions:     ${formatNumber(totalImpressions)}")
        echo("  Click-throughs:  ${formatNumber(totalClicks)}")
        echo("  Wishlists:       ${formatNumber(totalWishlists)}")
        echo("  Dismissals:      ${formatNumber(totalDismissals)}")
        echo("")
        echo("--- Rates ---")
        echo("  Click-through:   ${formatPercent(overallCtr)}")
        echo("  Wishlist:        ${formatPercent(overallWishlistRate)}")
        echo("  Dismissal:       ${formatPercent(overallDismissalRate)}")
        echo("")
    }

    private fun printTopPerformers(books: List<Book>) {
        echo("=".repeat(60))
        echo("                    TOP PERFORMERS")
        echo("=".repeat(60))
        echo("")

        // Top by clicks
        echo("--- Most Clicked ---")
        books.sortedByDescending { it.clickThroughCount }
            .take(top)
            .forEachIndexed { index, book ->
                echo("  ${index + 1}. ${book.title.take(35).padEnd(35)} ${formatNumber(book.clickThroughCount)} clicks")
            }
        echo("")

        // Top by CTR (with min impressions)
        echo("--- Best Click-Through Rate (min $minImpressions impressions) ---")
        books.filter { it.impressionCount >= minImpressions }
            .sortedByDescending { it.clickThroughCount.toDouble() / it.impressionCount }
            .take(top)
            .forEachIndexed { index, book ->
                val ctr = book.clickThroughCount.toDouble() / book.impressionCount * 100
                echo("  ${index + 1}. ${book.title.take(35).padEnd(35)} ${formatPercent(ctr)} (${book.clickThroughCount}/${book.impressionCount})")
            }
        echo("")

        // Top by wishlists
        echo("--- Most Wishlisted ---")
        books.sortedByDescending { it.wishlistCount }
            .take(top)
            .forEachIndexed { index, book ->
                echo("  ${index + 1}. ${book.title.take(35).padEnd(35)} ${formatNumber(book.wishlistCount)} wishlists")
            }
        echo("")
    }

    private fun printNeedsAttention(books: List<Book>) {
        echo("=".repeat(60))
        echo("                   NEEDS ATTENTION")
        echo("=".repeat(60))
        echo("")

        // Highest dismissal rate
        echo("--- Highest Dismissal Rate (min $minImpressions impressions) ---")
        books.filter { it.impressionCount >= minImpressions }
            .sortedByDescending { it.notInterestedCount.toDouble() / it.impressionCount }
            .take(top)
            .forEachIndexed { index, book ->
                val rate = book.notInterestedCount.toDouble() / book.impressionCount * 100
                echo("  ${index + 1}. ${book.title.take(35).padEnd(35)} ${formatPercent(rate)} (${book.notInterestedCount}/${book.impressionCount})")
            }
        echo("")

        // Lowest CTR (potential improvement candidates)
        echo("--- Lowest Click-Through Rate (min $minImpressions impressions) ---")
        books.filter { it.impressionCount >= minImpressions }
            .sortedBy { it.clickThroughCount.toDouble() / it.impressionCount }
            .take(top)
            .forEachIndexed { index, book ->
                val ctr = book.clickThroughCount.toDouble() / book.impressionCount * 100
                echo("  ${index + 1}. ${book.title.take(35).padEnd(35)} ${formatPercent(ctr)} (${book.clickThroughCount}/${book.impressionCount})")
            }
        echo("")

        // Books with no engagement (0 impressions)
        val noEngagement = books.filter { it.impressionCount == 0 }
        if (noEngagement.isNotEmpty()) {
            echo("--- No Impressions Yet (${noEngagement.size} books) ---")
            noEngagement.take(top).forEach { book ->
                echo("  - ${book.title.take(50)}")
            }
            if (noEngagement.size > top) {
                echo("  ... and ${noEngagement.size - top} more")
            }
            echo("")
        }
    }

    private fun printGenreBreakdown(books: List<Book>) {
        val genreGroups = books.groupBy { it.genre ?: "Uncategorized" }
        if (genreGroups.size <= 1 && genreGroups.containsKey("Uncategorized")) {
            return // No genre data
        }

        echo("=".repeat(60))
        echo("                   GENRE BREAKDOWN")
        echo("=".repeat(60))
        echo("")

        genreGroups.entries
            .sortedByDescending { it.value.sumOf { b -> b.impressionCount } }
            .forEach { (genre, genreBooks) ->
                val impressions = genreBooks.sumOf { it.impressionCount }
                val clicks = genreBooks.sumOf { it.clickThroughCount }
                val ctr = if (impressions > 0) clicks.toDouble() / impressions * 100 else 0.0

                echo("  ${genre.padEnd(25)} ${genreBooks.size} books | ${formatNumber(impressions)} impr | ${formatPercent(ctr)} CTR")
            }
        echo("")
    }

    private fun formatNumber(n: Int): String = String.format("%,d", n)

    private fun formatPercent(p: Double): String = String.format("%.1f%%", p)
}
