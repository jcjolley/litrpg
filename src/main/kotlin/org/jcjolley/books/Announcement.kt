package org.jcjolley.books

import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey
import java.time.Instant

@DynamoDbBean
data class Announcement(
    @get:DynamoDbPartitionKey
    var id: String = "",
    var title: String = "",
    var body: String = "",
    var createdAt: Long = Instant.now().toEpochMilli(),
    var upvoteCount: Int = 0,
    var downvoteCount: Int = 0,
)
