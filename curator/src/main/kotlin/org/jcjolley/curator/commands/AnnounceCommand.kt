package org.jcjolley.curator.commands

import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.parameters.arguments.argument
import com.github.ajalt.clikt.parameters.arguments.optional
import com.github.ajalt.clikt.parameters.options.option
import com.github.ajalt.clikt.parameters.types.file
import org.jcjolley.curator.repository.Announcement
import org.jcjolley.curator.repository.AnnouncementRepository
import java.io.File
import java.time.Instant
import java.util.UUID

class AnnounceCommand : CliktCommand(name = "announce") {
    override fun help(context: com.github.ajalt.clikt.core.Context) =
        "Create a new announcement for users"

    private val title by argument(help = "Announcement title")
    private val bodyArg by argument(name = "body", help = "Announcement body text (optional if --file is used)").optional()

    private val bodyFile by option("--file", "-f", help = "Read body from file instead of argument").file(mustExist = true, canBeDir = false)
    private val dynamoEndpoint by option("--dynamo", help = "DynamoDB endpoint (local testing)")

    override fun run() {
        val body = when {
            bodyFile != null -> bodyFile!!.readText().trim()
            bodyArg != null -> bodyArg!!
            else -> throw com.github.ajalt.clikt.core.UsageError("Must provide body as argument or via --file")
        }

        val repository = AnnouncementRepository(dynamoEndpoint)

        try {
            val announcement = Announcement(
                id = UUID.randomUUID().toString(),
                title = title,
                body = body,
                createdAt = Instant.now(),
            )

            repository.save(announcement)

            echo("Announcement created successfully!")
            echo("")
            echo("ID:      ${announcement.id}")
            echo("Title:   ${announcement.title}")
            echo("Body:    ${announcement.body}")
            echo("Created: ${announcement.createdAt}")

        } finally {
            repository.close()
        }
    }
}
