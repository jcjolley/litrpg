package org.jcjolley.curator.llm

import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import org.jcjolley.curator.model.BookFacts
import org.junit.jupiter.api.Test
import strikt.api.expectThat
import strikt.assertions.*

class LlamaSummarizerTest {

    private val mockOllamaClient = mockk<OllamaClient>()
    private val summarizer = LlamaSummarizer(mockOllamaClient)

    @Test
    fun `extractFacts parses valid JSON response`() = runTest {
        coEvery { mockOllamaClient.generate(any()) } returns """
            {
              "protagonist": "Zac",
              "setting": "Earth transformed by the System",
              "problem": "Stranded alone with monsters",
              "inciting_incident": "The System arrives",
              "goal": "Survive and find family",
              "tone": "gritty",
              "genre": "System Apocalypse"
            }
        """.trimIndent()

        val facts = summarizer.extractFacts("Some description")

        expectThat(facts.protagonist).isEqualTo("Zac")
        expectThat(facts.setting).isEqualTo("Earth transformed by the System")
        expectThat(facts.genre).isEqualTo("System Apocalypse")
        expectThat(facts.tone).isEqualTo("gritty")
    }

    @Test
    fun `extractFacts handles JSON with extra text`() = runTest {
        coEvery { mockOllamaClient.generate(any()) } returns """
            Here's the extracted information:

            {
              "protagonist": "Carl",
              "setting": "Dungeon world",
              "problem": "Must survive game show",
              "inciting_incident": "Earth collapses",
              "goal": "Survive with cat",
              "tone": "dark humor",
              "genre": "Dungeon Crawl"
            }

            Hope this helps!
        """.trimIndent()

        val facts = summarizer.extractFacts("Some description")

        expectThat(facts.protagonist).isEqualTo("Carl")
        expectThat(facts.genre).isEqualTo("Dungeon Crawl")
    }

    @Test
    fun `extractFacts returns empty facts on invalid JSON`() = runTest {
        coEvery { mockOllamaClient.generate(any()) } returns "This is not JSON at all"

        val facts = summarizer.extractFacts("Some description")

        expectThat(facts.protagonist).isNull()
        expectThat(facts.genre).isNull()
    }

    @Test
    fun `generateBlurb produces output from facts`() = runTest {
        coEvery { mockOllamaClient.generate(any()) } returns
            "When the System transforms Earth, Zac must survive alone with just a hatchet. System Apocalypse."

        val facts = BookFacts(
            protagonist = "Zac",
            setting = "Earth",
            problem = "Monsters",
            incitingIncident = "System arrives",
            goal = "Survive",
            tone = "gritty",
            genre = "System Apocalypse"
        )

        val blurb = summarizer.generateBlurb(facts)

        expectThat(blurb).contains("Zac")
        expectThat(blurb).contains("System Apocalypse")
    }

    @Test
    fun `generateBlurb adds genre tag if missing`() = runTest {
        coEvery { mockOllamaClient.generate(any()) } returns
            "When the System arrives, Zac must fight to survive."

        val facts = BookFacts(
            protagonist = "Zac",
            setting = null,
            problem = null,
            incitingIncident = null,
            goal = null,
            tone = null,
            genre = "System Apocalypse"
        )

        val blurb = summarizer.generateBlurb(facts)

        expectThat(blurb).endsWith("System Apocalypse.")
    }

    @Test
    fun `summarize runs both passes`() = runTest {
        // Pass 1 response
        coEvery { mockOllamaClient.generate(match { it.contains("Extract the key story facts") }) } returns """
            {
              "protagonist": "Lindon",
              "setting": "Sacred arts world",
              "problem": "Born Unsouled",
              "inciting_incident": "Vision of destruction",
              "goal": "Get stronger, save home",
              "tone": "epic",
              "genre": "Cultivation"
            }
        """.trimIndent()

        // Pass 2 response
        coEvery { mockOllamaClient.generate(match { it.contains("Write a 2-sentence book blurb") }) } returns
            "In a world of sacred artists, Lindon is born without power. He must forge his own path to save his homeland. Cultivation."

        val result = summarizer.summarize("Some long Audible description...")

        expectThat(result.facts.protagonist).isEqualTo("Lindon")
        expectThat(result.facts.genre).isEqualTo("Cultivation")
        expectThat(result.blurb).contains("Lindon")
        expectThat(result.blurb).contains("Cultivation")
    }

    @Test
    fun `SummarizationResult validates correctly`() {
        val validResult = SummarizationResult(
            facts = BookFacts("Zac", "Earth", "problem", "incident", "goal", "gritty", "System Apocalypse"),
            blurb = "When the System arrives Zac must survive alone in a dangerous new world filled with monsters and demons. He fights to find his family. System Apocalypse.",
            wordCount = 28
        )

        // This is invalid because it's under 30 words
        expectThat(validResult.isValid()).isFalse()
        expectThat(validResult.validationIssues()).contains("Too short (28 words, minimum 30)")

        val goodResult = validResult.copy(
            blurb = "When the apocalyptic System transforms Earth into a deadly multiverse battleground, Zac finds himself stranded alone in monster-infested wilderness with nothing but a hatchet. He must grow stronger to reunite with his family before chaos consumes them all. System Apocalypse.",
            wordCount = 42
        )
        expectThat(goodResult.isValid()).isTrue()
    }

    @Test
    fun `SummarizationResult detects question in blurb`() {
        val result = SummarizationResult(
            facts = BookFacts("Zac", "Earth", "problem", "incident", "goal", "gritty", "System Apocalypse"),
            blurb = "When the System arrives, Zac faces impossible odds. Can he survive long enough to find his family? System Apocalypse.",
            wordCount = 20
        )

        expectThat(result.isValid()).isFalse()
        expectThat(result.validationIssues()).contains("Contains a question")
    }
}
