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
    @get:DynamoDbSecondaryPartitionKey(indexNames = ["author-index"])
    var author: String = "",
    var authorUrl: String? = null,
    @get:DynamoDbSecondaryPartitionKey(indexNames = ["narrator-index"])
    var narrator: String? = null,
    var series: String? = null,
    var seriesPosition: Int? = null,
    var length: String? = null,             // Audio length (Audible only)
    var releaseDate: String? = null,
    var language: String = "English",
    var imageUrl: String = "",
    // Source-specific fields
    @get:DynamoDbSecondaryPartitionKey(indexNames = ["source-index"])
    var source: String = "AUDIBLE",         // "AUDIBLE" or "ROYAL_ROAD"
    var audibleUrl: String? = null,
    var audibleAsin: String? = null,
    var royalRoadUrl: String? = null,
    var royalRoadId: String? = null,
    @get:DynamoDbSecondarySortKey(indexNames = ["author-index", "length-index"])
    var rating: Double = 0.0,
    @get:DynamoDbSecondarySortKey(indexNames = ["genre-index", "popularity-index"])
    var numRatings: Int = 0,
    var pageCount: Int? = null,             // Royal Road page count
    var description: String = "",
    var wishlistCount: Int = 0,
    var clickThroughCount: Int = 0,
    var notInterestedCount: Int = 0,
    var impressionCount: Int = 0,
    var upvoteCount: Int = 0,
    var downvoteCount: Int = 0,
    // GSI filter fields
    @get:DynamoDbSecondaryPartitionKey(indexNames = ["genre-index"])
    var genre: String? = null,
    var lengthMinutes: Int? = null,
    @get:DynamoDbSecondaryPartitionKey(indexNames = ["length-index"])
    var lengthCategory: String? = null,
    @get:DynamoDbSecondaryPartitionKey(indexNames = ["popularity-index", "addedAt-index"])
    var gsiPartition: String = "BOOK",
    @get:DynamoDbSecondarySortKey(indexNames = ["addedAt-index"])
    var addedAt: Long = Instant.now().toEpochMilli(),
    var updatedAt: Long = Instant.now().toEpochMilli()
)
