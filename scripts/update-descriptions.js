const fs = require("fs");
const { execSync } = require("child_process");

// Simple HTML entity decoder
function decodeEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}

// Extract description from Audible HTML
function extractDescription(html) {
  // Try to find the publisher's summary section
  const patterns = [
    /<span[^>]*class="bc-text bc-color-secondary"[^>]*>([\s\S]*?)<\/span>/gi,
    /Publisher's Summary<\/h2>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/gi,
    /"description"\s*:\s*"([^"]+)"/i,
    /<meta[^>]*name="description"[^>]*content="([^"]+)"/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      let desc = match[1]
        .replace(/<[^>]+>/g, " ") // Remove HTML tags
        .replace(/\s+/g, " ") // Normalize whitespace
        .trim();
      desc = decodeEntities(desc);
      if (desc.length > 100) return desc;
    }
  }

  // Fallback: look for any long text block that looks like a description
  const textBlocks = html.match(/>([^<]{200,})</g);
  if (textBlocks) {
    for (const block of textBlocks) {
      const text = decodeEntities(block.slice(1, -1).trim());
      if (
        !text.includes("{") &&
        !text.includes("function") &&
        !text.includes("window.")
      ) {
        return text;
      }
    }
  }

  return null;
}

// Create a concise 2-sentence summary (30-70 words)
function createSummary(fullDescription, title, author) {
  if (!fullDescription) return null;

  // Clean the description
  let text = fullDescription
    .replace(/\s+/g, " ")
    .replace(/©.*$/i, "") // Remove copyright
    .replace(/\[.*?\]/g, "") // Remove bracketed text
    .trim();

  // Split into sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

  // Take first 2-3 sentences, aiming for 30-70 words
  let summary = "";
  let wordCount = 0;

  for (const sentence of sentences) {
    const words = sentence.trim().split(/\s+/).length;
    if (wordCount + words <= 75) {
      summary += sentence.trim() + " ";
      wordCount += words;
      if (wordCount >= 30 && sentences.indexOf(sentence) >= 1) break;
    } else if (wordCount < 30) {
      // If we haven't reached minimum, add partial
      summary += sentence.trim() + " ";
      break;
    } else {
      break;
    }
  }

  summary = summary.trim();

  // If too short, return null
  if (summary.split(/\s+/).length < 20) return null;

  return summary;
}

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });
      if (response.ok) {
        return await response.text();
      }
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  return null;
}

async function main() {
  const books = JSON.parse(fs.readFileSync("data/books-prod.json", "utf8"));
  const audibleBooks = books.filter((b) => b.audibleUrl);

  console.log(`Processing ${audibleBooks.length} books with Audible URLs...\n`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < audibleBooks.length; i++) {
    const book = audibleBooks[i];
    process.stdout.write(
      `[${i + 1}/${audibleBooks.length}] ${book.title.slice(0, 40)}... `
    );

    try {
      // Fetch Audible page
      const html = await fetchWithRetry(book.audibleUrl);
      if (!html) {
        console.log("FETCH FAILED");
        failed++;
        continue;
      }

      // Extract description
      const fullDesc = extractDescription(html);
      if (!fullDesc) {
        console.log("NO DESC FOUND");
        skipped++;
        continue;
      }

      // Create summary
      const summary = createSummary(fullDesc, book.title, book.author);
      if (!summary) {
        console.log("SUMMARY TOO SHORT");
        skipped++;
        continue;
      }

      // Update DynamoDB
      const escapedSummary = summary.replace(/"/g, '\\"').replace(/'/g, "'");
      const cmd = `aws dynamodb update-item --table-name litrpg-books-dev --key '{"id": {"S": "${book.id}"}}' --update-expression "SET description = :d" --expression-attribute-values '{":d": {"S": "${escapedSummary}"}}' --region us-west-2`;

      execSync(cmd, { stdio: "pipe" });
      console.log("UPDATED");
      updated++;

      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      console.log(`ERROR: ${err.message.slice(0, 50)}`);
      failed++;
    }
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`Done! Updated: ${updated}, Skipped: ${skipped}, Failed: ${failed}`);
}

main().catch(console.error);
