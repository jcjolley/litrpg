package org.jcjolley.curator.commands

import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.parameters.arguments.argument
import com.github.ajalt.clikt.parameters.options.flag
import com.github.ajalt.clikt.parameters.options.option
import org.jcjolley.curator.repository.BookRepository

class RemoveCommand : CliktCommand(
    name = "remove",
    help = "Remove a book from the catalog"
) {
    private val bookId by argument(help = "Book ID to remove")

    private val force by option("-f", "--force", help = "Skip confirmation")
        .flag(default = false)

    private val dynamoEndpoint by option("--dynamo", help = "DynamoDB endpoint (local testing)")

    override fun run() {
        val repository = BookRepository(dynamoEndpoint)

        try {
            val book = repository.findById(bookId)

            if (book == null) {
                echo(red("Book not found: $bookId"))
                return
            }

            echo("Found book:")
            echo("  Title:  ${book.title}")
            echo("  Author: ${book.author}")
            echo("  ID:     ${book.id}")
            echo("")

            if (!force) {
                echo(yellow("Are you sure you want to remove this book? [y/N] "), trailingNewline = false)
                val input = readLine()?.trim()?.lowercase()

                if (input != "y" && input != "yes") {
                    echo("Cancelled.")
                    return
                }
            }

            val deleted = repository.delete(bookId)
            if (deleted) {
                echo(green("✓ Book removed from catalog"))
            } else {
                echo(red("Failed to remove book"))
            }

        } finally {
            repository.close()
        }
    }

    private fun green(text: String) = "\u001B[32m$text\u001B[0m"
    private fun yellow(text: String) = "\u001B[33m$text\u001B[0m"
    private fun red(text: String) = "\u001B[31m$text\u001B[0m"
}
