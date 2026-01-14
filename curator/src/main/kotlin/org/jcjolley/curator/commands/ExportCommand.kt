package org.jcjolley.curator.commands

import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.parameters.options.option
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.jcjolley.curator.repository.BookRepository
import java.io.File

class ExportCommand : CliktCommand(name = "export") {
    override fun help(context: com.github.ajalt.clikt.core.Context) =
        "Export catalog to JSON file"

    private val output by option("-o", "--output", help = "Output file path (default: stdout)")

    private val dynamoEndpoint by option("--dynamo", help = "DynamoDB endpoint (local testing)")

    private val json = Json {
        prettyPrint = true
        encodeDefaults = true
    }

    override fun run() {
        val repository = BookRepository(dynamoEndpoint)

        try {
            val books = repository.findAll()

            if (books.isEmpty()) {
                echo("No books to export.", err = true)
                return
            }

            val jsonOutput = json.encodeToString(books)

            if (output != null) {
                val outputFile = File(output!!)
                outputFile.parentFile?.mkdirs()
                outputFile.writeText(jsonOutput)
                echo("Exported ${books.size} book(s) to $output")
            } else {
                echo(jsonOutput)
            }

        } finally {
            repository.close()
        }
    }
}
