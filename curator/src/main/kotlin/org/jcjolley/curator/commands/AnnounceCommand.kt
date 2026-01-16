package org.jcjolley.curator.commands

import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.parameters.arguments.argument
import com.github.ajalt.clikt.parameters.options.option
import org.jcjolley.curator.repository.Announcement
import org.jcjolley.curator.repository.AnnouncementRepository
import java.time.Instant
import java.util.UUID

class AnnounceCommand : CliktCommand(name = "announce") {
    override fun help(context: com.github.ajalt.clikt.core.Context) =
        "Create a new announcement for users"

    private val title by argument(help = "Announcement title")
    private val body by argument(help = "Announcement body text")

    private val dynamoEndpoint by option("--dynamo", help = "DynamoDB endpoint (local testing)")

    override fun run() {
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
