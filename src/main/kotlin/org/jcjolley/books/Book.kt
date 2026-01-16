package org.jcjolley.books

import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSecondaryPartitionKey
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSecondarySortKey
import java.time.Instant

@DynamoDbBean
data class Book(
    @get:DynamoDbPartitionKey
    var id: String = "",
    var title: String = "",
    var subtitle: String? = null,
    var author: String = "",
    var authorUrl: String? = null,
    var narrator: String? = null,
    var series: String? = null,
    var seriesPosition: Int? = null,
    var length: String? = null,             // Audio length (Audible only)
    var releaseDate: String? = null,
    var language: String = "English",
    var imageUrl: String = "",
    // Source-specific fields
    var source: String = "AUDIBLE",         // "AUDIBLE" or "ROYAL_ROAD"
    var audibleUrl: String? = null,
    var audibleAsin: String? = null,
    var royalRoadUrl: String? = null,
    var royalRoadId: String? = null,
    var rating: Double = 0.0,
    var numRatings: Int = 0,
    var pageCount: Int? = null,             // Royal Road page count
    var description: String = "",
    var wishlistCount: Int = 0,
    var clickThroughCount: Int = 0,
    var notInterestedCount: Int = 0,
    var impressionCount: Int = 0,
    var upvoteCount: Int = 0,
    var downvoteCount: Int = 0,
    // Multi-genre support (1-5 genres per book)
    var genres: List<String> = emptyList(),
    var lengthMinutes: Int? = null,
    var lengthCategory: String? = null,
    // GSI partition key - only used for addedAt-index now
    @get:DynamoDbSecondaryPartitionKey(indexNames = ["addedAt-index"])
    var gsiPartition: String = "BOOK",
    @get:DynamoDbSecondarySortKey(indexNames = ["addedAt-index"])
    var addedAt: Long = Instant.now().toEpochMilli(),
    var updatedAt: Long = Instant.now().toEpochMilli()
)
