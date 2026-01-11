package org.jcjolley.curator

import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.core.subcommands
import org.jcjolley.curator.commands.*

class Curator : CliktCommand(
    help = "LitRPG book curation CLI - manage book catalog for next-litrpg"
) {
    override fun run() = Unit
}

fun main(args: Array<String>) {
    Curator()
        .subcommands(
            AddCommand(),
            ListCommand(),
            UpdateCommand(),
            RemoveCommand(),
            ExportCommand(),
            ImportCommand()
        )
        .main(args)
}
