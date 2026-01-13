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
    var series: String? = null,
    var seriesPosition: Int? = null,
    var length: String = "",
    var releaseDate: String = "",
    var language: String = "English",
    var imageUrl: String = "",
    var audibleUrl: String = "",
    var audibleAsin: String = "",
    @get:DynamoDbSecondarySortKey(indexNames = ["author-index", "length-index"])
    var rating: Double = 0.0,
    @get:DynamoDbSecondarySortKey(indexNames = ["subgenre-index", "popularity-index"])
    var numRatings: Int = 0,
    var description: String = "",
    var wishlistCount: Int = 0,
    var clickThroughCount: Int = 0,
    var notInterestedCount: Int = 0,
    var impressionCount: Int = 0,
    // GSI filter fields
    @get:DynamoDbSecondaryPartitionKey(indexNames = ["subgenre-index"])
    var subgenre: String? = null,
    var lengthMinutes: Int? = null,
    @get:DynamoDbSecondaryPartitionKey(indexNames = ["length-index"])
    var lengthCategory: String? = null,
    @get:DynamoDbSecondaryPartitionKey(indexNames = ["popularity-index"])
    var gsiPartition: String = "BOOK",
    var addedAt: Long = Instant.now().toEpochMilli(),
    var updatedAt: Long = Instant.now().toEpochMilli()
)
