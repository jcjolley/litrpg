package org.jcjolley.curator.commands

import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.parameters.arguments.argument
import com.github.ajalt.clikt.parameters.options.flag
import com.github.ajalt.clikt.parameters.options.option
import kotlinx.serialization.json.Json
import org.jcjolley.curator.model.Book
import org.jcjolley.curator.repository.BookRepository
import java.io.File

class ImportCommand : CliktCommand(name = "import") {
    override fun help(context: com.github.ajalt.clikt.core.Context) =
        "Import books from JSON file"

    private val inputFile by argument(help = "JSON file to import")

    private val dryRun by option("--dry-run", help = "Preview import without saving")
        .flag(default = false)

    private val dynamoEndpoint by option("--dynamo", help = "DynamoDB endpoint (local testing)")

    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
    }

    override fun run() {
        val repository = BookRepository(dynamoEndpoint)

        try {
            // Ensure table exists for local testing
            if (dynamoEndpoint != null) {
                repository.createTableIfNotExists()
            }

            val file = File(inputFile)
            if (!file.exists()) {
                echo(red("File not found: $inputFile"))
                return
            }

            val books: List<Book> = json.decodeFromString(file.readText())

            if (books.isEmpty()) {
                echo("No books found in file.")
                return
            }

            echo("Found ${books.size} book(s) to import:")
            echo("")

            books.forEach { book ->
                echo("• ${book.title} by ${book.author}")
            }

            echo("")

            if (dryRun) {
                echo(yellow("Dry run - no changes made"))
                return
            }

            var imported = 0
            var skipped = 0

            books.forEach { book ->
                val existing = repository.findById(book.id)
                if (existing != null) {
                    echo(yellow("Skipping (exists): ${book.title}"))
                    skipped++
                } else {
                    repository.save(book)
                    echo(green("✓") + " Imported: ${book.title}")
                    imported++
                }
            }

            echo("")
            echo("Import complete: $imported imported, $skipped skipped")

        } finally {
            repository.close()
        }
    }

    private fun green(text: String) = "\u001B[32m$text\u001B[0m"
    private fun yellow(text: String) = "\u001B[33m$text\u001B[0m"
    private fun red(text: String) = "\u001B[31m$text\u001B[0m"
}
