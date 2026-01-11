# Book Summarization Prompt for Llama

## Recommended Model
- **Minimum**: llama3.2:3b (tested)
- **Better**: llama3:8b or larger for more nuanced output

## Two-Pass Approach

Small models work best with **focused, single-purpose prompts**. We use two LLM calls:

```
┌─────────────────────┐     ┌─────────────────────┐
│  Pass 1: Extract    │────▶│  Pass 2: Generate   │
│  Facts (JSON)       │     │  Blurb (Creative)   │
└─────────────────────┘     └─────────────────────┘
```

**Why two passes?**
- Audible descriptions vary wildly in format
- Extracting facts programmatically is brittle
- Each LLM call does one thing well
- Structured intermediate format prevents hallucination

---

## Pass 1: Fact Extraction

Extract structured facts from the raw description. Output as JSON for reliable parsing.

```
Extract the key story facts from this book description. Output valid JSON only.

DESCRIPTION:
{audible_description}

Output this exact JSON structure (fill in values, use null if not found):
{
  "protagonist": "name of main character",
  "setting": "world or location description",
  "problem": "the conflict or challenge they face",
  "inciting_incident": "what forces them to act",
  "goal": "what they are trying to achieve",
  "tone": "dark humor / epic / gritty / lighthearted",
  "genre": "Cultivation / System Apocalypse / Dungeon Crawl / GameLit / Isekai / Tower Climb / Progression Fantasy"
}

JSON:
```

### Pass 1 Example

**Input:**
```
Zac was alone in the middle of the forest when the world changed. The whole planet
was introduced to the multiverse by an unfeeling System. A universe where an endless
number of races and civilizations fought for power and dominion. Zac finds himself
stuck in the wilderness surrounded by deadly beasts, demons, and worse. Alone, lost
and without answers, he must find the means to survive and get stronger in this new
cut-throat reality. With only a hatchet for his weapon, he'll have to seek out his
family before the world collapses... or die trying.
```

**Expected Output:**
```json
{
  "protagonist": "Zac",
  "setting": "Earth transformed by the System, merging with a multiverse",
  "problem": "Stranded alone surrounded by deadly beasts and demons with only a hatchet",
  "inciting_incident": "The System arrives and transforms the planet",
  "goal": "Survive, get stronger, find his family",
  "tone": "gritty",
  "genre": "System Apocalypse"
}
```

---

## Pass 2: Blurb Generation

Take the extracted facts and generate an engaging summary.

```
Write a 2-sentence book blurb using these facts.

FACTS:
- Protagonist: {protagonist}
- Setting: {setting}
- Problem: {problem}
- Inciting incident: {inciting_incident}
- Goal: {goal}
- Tone: {tone}
- Genre: {genre}

STRICT RULES:
1. EXACTLY 2 sentences, then the genre tag
2. Total under 50 words (count them!)
3. First sentence = hook with protagonist
4. Second sentence = stakes/goal
5. End with: "{genre}."
6. NO questions. Statements only.
7. NO "Will he survive?" or "Can she...?" style endings

Blurb:
```

### Pass 2 Example

**Input (from Pass 1 output):**
```
FACTS:
- Protagonist: Zac
- Setting: Earth transformed by the System, merging with a multiverse
- Problem: Stranded alone surrounded by deadly beasts and demons with only a hatchet
- Inciting incident: The System arrives and transforms the planet
- Goal: Survive, get stronger, find his family
- Tone: gritty
- Genre: System Apocalypse

Blurb:
```

**Expected Output:**
```
When the System transforms Earth into a multiverse battleground, Zac finds himself
stranded in monster-infested wilderness with nothing but a hatchet. He must level up
fast enough to find his family before the apocalypse claims them all. System Apocalypse.
```

## Example Input/Output

### Example 1: Defiance of the Fall (Fact-Based)

**Input:**
```
Facts:
- Protagonist: Zac
- Setting: Earth transformed by the System, merging with a multiverse
- Problem: Stranded alone on a monster-infested island with just a hatchet
- Inciting incident: The System arrives, transforming Earth
- Goal: Survive, get stronger, find his family
- Genre: System Apocalypse / Cultivation

Blurb:
```

**Output (from llama3.2:3b):**
```
When a merciless System catapults him into an apocalyptic multiverse, Zac musters all his wits and a battered hatchet to survive in a realm where only the strongest thrive. Trapped in a desolate wilderness, he must grow stronger to reunite with his family before the world succumbs to chaos. System Apocalypse.
```

### Example 2: Dungeon Crawler Carl (Fact-Based)

**Input:**
```
Facts:
- Protagonist: Carl, a Coast Guard veteran
- Setting: Earth transformed into an 18-level dungeon for alien entertainment
- Problem: Must survive a deadly game show where entertainment value matters more than strength
- Inciting incident: All buildings collapse, humans forced to become dungeon contestants
- Goal: Survive with his cat Princess Donut, reach lower levels, gain followers
- Genre: Dungeon Crawl / Dark Comedy

Blurb:
```

**Expected Output:**
```
When Earth collapses into a deadly game show dungeon, Coast Guard vet Carl and his ex-girlfriend's cat Princess Donut must kill monsters with style to survive. In this satirical LitRPG, your follower count matters more than your stats. Dungeon Crawl meets Dark Comedy.
```

### Example 3: Cradle (Fact-Based)

**Input:**
```
Facts:
- Protagonist: Lindon
- Setting: World of sacred artists who use madra (magic)
- Problem: Lindon is born Unsouled - he cannot use magic
- Inciting incident: He sees a vision of his homeland's destruction
- Goal: Leave home, get stronger, save his people
- Genre: Cultivation fantasy

Blurb:
```

**Output (from llama3.2:3b):**
```
In a world where sacred artists wield powerful madra, young Lindon is born Unsouled, shunned by society and doomed to walk the path alone. With visions of his homeland's destruction burning within him, he embarks on a quest to unlock his hidden potential and save those he loves. Cultivation fantasy.
```

## Quality Checklist

Before accepting a generated summary, verify:

- [ ] 2 sentences (3 max)
- [ ] Under 60 words
- [ ] No copied phrases from source
- [ ] Has a hook in the first sentence
- [ ] Mentions protagonist by name
- [ ] Ends with genre tag
- [ ] No spoilers beyond premise
- [ ] No questions
- [ ] Accurate to source (no hallucinations)

## Regeneration Triggers

Request a new summary if:
- Over 70 words
- Under 30 words
- Copies source text verbatim
- Missing genre tag
- Contains hallucinated details (wrong names, places)
- Ends with a question
- Sounds like a review ("readers will love...")

---

## CLI Implementation Notes

### Workflow

```
1. Scrape Audible page → get full description
2. Extract facts (protagonist, setting, problem, goal, genre)
3. Call Llama with fact-based prompt
4. Display result for user review
5. [A]ccept / [E]dit / [R]egenerate / [C]ancel
6. Store accepted summary in DynamoDB
```

### Ollama API Call (Kotlin)

```kotlin
data class OllamaRequest(
    val model: String = "llama3.2:latest",
    val prompt: String,
    val stream: Boolean = false
)

data class OllamaResponse(
    val response: String,
    val done: Boolean
)

suspend fun generateSummary(facts: BookFacts): String {
    val prompt = """
        Rewrite this into an engaging 2-sentence blurb (under 50 words).
        Keep all facts accurate. End with the genre tag.

        Facts:
        - Protagonist: ${facts.protagonist}
        - Setting: ${facts.setting}
        - Problem: ${facts.problem}
        - Inciting incident: ${facts.incitingIncident}
        - Goal: ${facts.goal}
        - Genre: ${facts.genre}

        Blurb:
    """.trimIndent()

    val response = httpClient.post("http://localhost:11434/api/generate") {
        contentType(ContentType.Application.Json)
        setBody(OllamaRequest(prompt = prompt))
    }

    return response.body<OllamaResponse>().response.trim()
}
```

### Genre Tags (Standardized)

Use these consistent genre tags:
- `Cultivation`
- `System Apocalypse`
- `Dungeon Crawl`
- `Tower Climb`
- `GameLit`
- `Isekai`
- `Progression Fantasy`
- `Virtual Reality`
