package org.jcjolley.curator.model

import kotlinx.serialization.Serializable
import java.time.Instant
import java.util.UUID

@Serializable
data class Book(
    val id: String = UUID.randomUUID().toString(),
    val title: String,
    val subtitle: String? = null,
    val author: String,
    val authorUrl: String? = null,
    val narrator: String? = null,
    val series: String? = null,
    val seriesPosition: Int? = null,
    val length: String? = null,             // Audio length (Audible only)
    val releaseDate: String? = null,
    val language: String = "English",
    val imageUrl: String,

    // Source-specific URLs (one will be set based on source)
    val source: String = "AUDIBLE",         // "AUDIBLE" or "ROYAL_ROAD"
    val audibleUrl: String? = null,
    val audibleAsin: String? = null,
    val royalRoadUrl: String? = null,
    val royalRoadId: String? = null,

    // Source metrics (scraped)
    val rating: Double,
    val numRatings: Int,
    val pageCount: Int? = null,             // Royal Road page count

    // Original content (generated via Llama)
    val description: String,

    // Platform metrics (aggregated from users) - start at 0
    val wishlistCount: Int = 0,
    val clickThroughCount: Int = 0,
    val notInterestedCount: Int = 0,
    val impressionCount: Int = 0,
    val upvoteCount: Int = 0,
    val downvoteCount: Int = 0,

    // Multi-genre support (1-5 genres per book)
    val genres: List<String> = emptyList(),
    val lengthMinutes: Int? = null,         // Parsed from length string (Audible)
    val lengthCategory: String? = null,     // Short/Medium/Long/Epic
    val gsiPartition: String = "BOOK",      // Fixed partition key for popularity GSI

    // Metadata (serialized as epoch millis)
    @Serializable(with = InstantSerializer::class)
    val addedAt: Instant = Instant.now(),
    @Serializable(with = InstantSerializer::class)
    val updatedAt: Instant = Instant.now()
)

/**
 * Raw scraped data from Audible before Llama processing
 */
@Serializable
data class ScrapedBook(
    val title: String,
    val subtitle: String?,
    val author: String,
    val authorUrl: String?,
    val narrator: String?,
    val series: String?,
    val seriesPosition: Int?,
    val length: String,
    val releaseDate: String,
    val language: String,
    val imageUrl: String,
    val audibleUrl: String,
    val audibleAsin: String,
    val rating: Double,
    val numRatings: Int,
    val originalDescription: String  // Audible's description, used to generate our summary
)

/**
 * Raw scraped data from Royal Road before Llama processing
 */
@Serializable
data class ScrapedRoyalRoadBook(
    val title: String,
    val author: String,
    val authorUrl: String?,
    val tags: List<String>,
    val pageCount: Int,
    val chapterCount: Int,
    val followers: Int,
    val views: Int,
    val imageUrl: String,
    val royalRoadUrl: String,
    val royalRoadId: String,
    val rating: Double,
    val numRatings: Int,
    val originalDescription: String
)

/**
 * Facts extracted from description by Llama Pass 1
 */
@Serializable
data class BookFacts(
    val protagonist: String?,
    val setting: String?,
    val problem: String?,
    val incitingIncident: String?,
    val goal: String?,
    val tone: String?,
    val genres: List<String> = emptyList()
)
