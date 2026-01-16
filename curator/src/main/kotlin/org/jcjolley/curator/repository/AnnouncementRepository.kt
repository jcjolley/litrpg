package org.jcjolley.curator.repository

import mu.KotlinLogging
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable
import software.amazon.awssdk.enhanced.dynamodb.Key
import software.amazon.awssdk.enhanced.dynamodb.TableSchema
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.dynamodb.DynamoDbClient
import software.amazon.awssdk.services.dynamodb.model.*
import java.net.URI
import java.time.Instant

private val logger = KotlinLogging.logger {}

class AnnouncementRepository(
    endpoint: String? = null,
    tableName: String? = null,
    region: Region = BookRepository.getRegion()
) {
    private val dynamoDbClient: DynamoDbClient
    private val enhancedClient: DynamoDbEnhancedClient
    private val announcementsTable: DynamoDbTable<AnnouncementEntity>
    val tableName: String

    companion object {
        const val DEFAULT_TABLE_NAME = "litrpg-books-dev-announcements"

        fun getTableName(): String {
            return System.getenv("ANNOUNCEMENTS_TABLE_NAME") ?: DEFAULT_TABLE_NAME
        }
    }

    init {
        this.tableName = tableName ?: getTableName()

        val clientBuilder = DynamoDbClient.builder()
            .region(region)

        if (endpoint != null) {
            clientBuilder
                .endpointOverride(URI.create(endpoint))
                .credentialsProvider(
                    StaticCredentialsProvider.create(
                        AwsBasicCredentials.create("dummy", "dummy")
                    )
                )
        }

        dynamoDbClient = clientBuilder.build()
        enhancedClient = DynamoDbEnhancedClient.builder()
            .dynamoDbClient(dynamoDbClient)
            .build()

        announcementsTable = enhancedClient.table(this.tableName, TableSchema.fromBean(AnnouncementEntity::class.java))
    }

    fun createTableIfNotExists() {
        try {
            dynamoDbClient.describeTable { it.tableName(tableName) }
            logger.debug { "Table $tableName already exists" }
        } catch (e: ResourceNotFoundException) {
            logger.info { "Creating table $tableName..." }

            dynamoDbClient.createTable { builder ->
                builder.tableName(tableName)
                    .keySchema(
                        KeySchemaElement.builder()
                            .attributeName("id")
                            .keyType(KeyType.HASH)
                            .build()
                    )
                    .attributeDefinitions(
                        AttributeDefinition.builder()
                            .attributeName("id")
                            .attributeType(ScalarAttributeType.S)
                            .build()
                    )
                    .billingMode(BillingMode.PAY_PER_REQUEST)
            }

            dynamoDbClient.waiter().waitUntilTableExists { it.tableName(tableName) }
            logger.info { "Table $tableName created successfully" }
        }
    }

    fun save(announcement: Announcement): Announcement {
        val entity = announcement.toEntity()
        announcementsTable.putItem(entity)
        logger.debug { "Saved announcement: ${announcement.title} (${announcement.id})" }
        return announcement
    }

    fun findById(id: String): Announcement? {
        val key = Key.builder().partitionValue(id).build()
        return announcementsTable.getItem(key)?.toAnnouncement()
    }

    fun findAll(): List<Announcement> {
        return announcementsTable.scan()
            .items()
            .map { it.toAnnouncement() }
            .sortedByDescending { it.createdAt }
    }

    fun delete(id: String): Boolean {
        val key = Key.builder().partitionValue(id).build()
        val existing = announcementsTable.getItem(key)
        return if (existing != null) {
            announcementsTable.deleteItem(key)
            logger.debug { "Deleted announcement: $id" }
            true
        } else {
            false
        }
    }

    fun count(): Long {
        return announcementsTable.scan().items().count().toLong()
    }

    fun close() {
        dynamoDbClient.close()
    }
}

data class Announcement(
    val id: String,
    val title: String,
    val body: String,
    val createdAt: Instant = Instant.now(),
    val upvoteCount: Int = 0,
    val downvoteCount: Int = 0,
)

@DynamoDbBean
data class AnnouncementEntity(
    @get:DynamoDbPartitionKey
    var id: String = "",
    var title: String = "",
    var body: String = "",
    var createdAt: Long = 0,
    var upvoteCount: Int = 0,
    var downvoteCount: Int = 0,
)

fun Announcement.toEntity() = AnnouncementEntity(
    id = id,
    title = title,
    body = body,
    createdAt = createdAt.toEpochMilli(),
    upvoteCount = upvoteCount,
    downvoteCount = downvoteCount,
)

fun AnnouncementEntity.toAnnouncement() = Announcement(
    id = id,
    title = title,
    body = body,
    createdAt = Instant.ofEpochMilli(createdAt),
    upvoteCount = upvoteCount,
    downvoteCount = downvoteCount,
)
