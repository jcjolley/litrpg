# Pending Tasks

## Curator Migration (High Priority)

The data model was updated to consolidate `subgenre` into `genre`. Before deploying to production:

1. **Update curator commands** to use the new field names:
   - `AddCommand.kt` - ensure it populates `genre` (not `subgenre`)
   - `MigrateCommand.kt` - update to handle the rename
   - Any other commands that reference `subgenre`

2. **Migrate existing production books**:
   ```bash
   # Run against production DynamoDB
   ./gradlew :curator:run --args="migrate"
   ```
   This will:
   - Populate `lengthMinutes` and `lengthCategory` from the `length` string
   - Extract `genre` via LLM for books that don't have it

3. **Update Terraform GSIs** (if not already done):
   - Rename `subgenre-index` to `genre-index`
   - Apply terraform changes before running migration

## Notes
- The `genre` field replaces both the old `genre` and `subgenre` fields
- Valid genres: Cultivation, System Apocalypse, Dungeon Core, GameLit, Isekai, Tower Climb, Progression Fantasy, Base Building, Time Loop, Reincarnation, Academy, VR Game, Kingdom Building, Monster Evolution, Solo Leveling, Portal Fantasy, Apocalypse Survival, Dungeon Diving
