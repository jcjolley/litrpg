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
    val series: String? = null,
    val seriesPosition: Int? = null,
    val length: String,
    val releaseDate: String,
    val language: String = "English",
    val imageUrl: String,
    val audibleUrl: String,
    val audibleAsin: String,

    // Audible metrics (scraped)
    val rating: Double,
    val numRatings: Int,

    // Original content (generated via Llama)
    val description: String,

    // Platform metrics (aggregated from users) - start at 0
    val wishlistCount: Int = 0,
    val clickThroughCount: Int = 0,
    val notInterestedCount: Int = 0,
    val impressionCount: Int = 0,

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
    val genre: String?
)
