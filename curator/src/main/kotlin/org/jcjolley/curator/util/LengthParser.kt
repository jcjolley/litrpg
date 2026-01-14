package org.jcjolley.curator.util

/**
 * Utility for parsing Audible length strings and computing length categories.
 */
object LengthParser {
    /**
     * Parse Audible length string to total minutes.
     * Handles formats like: "12 hrs 45 mins", "13 hrs and 14 mins", "8 hrs", "45 mins"
     */
    fun parseToMinutes(length: String): Int {
        val hoursMatch = Regex("""(\d+)\s*hr""").find(length)
        val minsMatch = Regex("""(\d+)\s*min""").find(length)

        val hours = hoursMatch?.groupValues?.get(1)?.toIntOrNull() ?: 0
        val mins = minsMatch?.groupValues?.get(1)?.toIntOrNull() ?: 0

        return (hours * 60) + mins
    }

    /**
     * Compute length category from minutes.
     * - Short: < 6 hours (360 mins)
     * - Medium: 6-12 hours (360-720 mins)
     * - Long: 12-24 hours (720-1440 mins)
     * - Epic: 24+ hours (1440+ mins)
     * Returns null if minutes is null (e.g., for Royal Road books)
     */
    fun computeCategory(minutes: Int?): String? = when {
        minutes == null -> null
        minutes < 360 -> "Short"
        minutes < 720 -> "Medium"
        minutes < 1440 -> "Long"
        else -> "Epic"
    }
}
