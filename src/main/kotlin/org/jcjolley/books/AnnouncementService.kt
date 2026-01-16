package org.jcjolley.books

import jakarta.enterprise.context.ApplicationScoped
import org.eclipse.microprofile.config.inject.ConfigProperty
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient
import software.amazon.awssdk.enhanced.dynamodb.TableSchema

@ApplicationScoped
class AnnouncementService(
    private val dynamoDbEnhancedClient: DynamoDbEnhancedClient,
    @ConfigProperty(name = "dynamodb.announcements.table.name", defaultValue = "litrpg-books-dev-announcements")
    private val tableName: String
) {
    private val announcementTable by lazy {
        dynamoDbEnhancedClient.table(tableName, TableSchema.fromBean(Announcement::class.java))
    }

    fun getAnnouncements(): List<Announcement> {
        return announcementTable.scan().items()
            .toList()
            .sortedByDescending { it.createdAt }
    }

    fun getAnnouncement(id: String): Announcement? {
        return announcementTable.getItem { it.key { k -> k.partitionValue(id) } }
    }

    fun incrementUpvote(id: String): Boolean {
        val announcement = getAnnouncement(id) ?: return false
        announcement.upvoteCount += 1
        announcementTable.putItem(announcement)
        return true
    }

    fun incrementDownvote(id: String): Boolean {
        val announcement = getAnnouncement(id) ?: return false
        announcement.downvoteCount += 1
        announcementTable.putItem(announcement)
        return true
    }
}
