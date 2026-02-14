The "Cognitive OS"

Task: Build a "Cognitive Operating System" for mastery-level learning using T3-chat and Sqlite

Core Philosophy: Transform Raw information into digital circuits (mermaid js), which then become Neural Circuits (Active Recall)

Information: Information can be divided into 3 types:
Low-signal text: Self-help books, philosophy books, business books. Where the content is little and the fluff is high.
High-signal text: Legal books, fiqh books, CS/math books. Where the content is highly pure and there is little to no noise
Struggle: Math/DSA/Fiqh where I need to be involved in testing myself, struggling, and learning everything through practice

We need a rigorous framework to convert all the above information into digital knowledge circuits which are then encoded into my brain's neural circuits

# Method
For low signal text, we follow the following algorithm

i read the text for 10 minutes -> I click on "record" and blurt out what I learnt in those 10 minutes -> openAI whisper transcribes my audio into text -> gemini flash 3 cleans up my blurt into cleaned markdown text -> we put in the section i learnt and the cleaned up text into gemini flash 3 again and ask it to find any gems I might've missed. Then finally we call gemini 3 flash again to generate high-quality questions for the active recall sessions. We also call gemini 3 flash to create the mermaid graph for what I just learnt

For high-signal text, we need to encode everything into clustered knowledge graphs. The idea is to stay away from huge graphs, but to focus on clustered, focused, visual diagrams.

For fiqh text, we need to store the logical if-else conditions as well as the source (hadith, scholars, etc) behind each logical decision we make.

For math text, we need to store the derivation, logical flow, how concepts relate to each other.

But for all these, I also need some place to store where I struggled: "I forgot this step", "If forgot this logical jump", etc

# Data infrastructure
Implement a relational schema to store the required data:
- sources: A content-Addressable storage of PDFs/images (storing metadata and file paths)
- low_signal_sessions: Raw whisper transcriptions, timestamps, blurt, ai_cleanup, gems missed, active recall questions
- nodes: Atomic units of knowledge (type: gate, input, output, struggle, source, etc)
- edges: The logical wires (source_id, target_id, logic_label, etc)
- neural_lock: Spaced repetition data (FSRS or SM-2 parameters)

# Part A: The Ingestion Pipeline (Whisper & Blurt):

Create an API route that accepts audio files.

Integrate OpenAI Whisper for transcription.

LLM Cleanup Layer: Process the transcript to:

Extract "Gems" (High-signal facts).

Create a Mermaid Skeleton of the blurt.

Generate Active Recall Questions based on the blurt.

Provide a UI for the user to "Audit" and edit the AI's cleanup before saving to the DB.

# Part B: The High-Signal Graph Engine:

Mermaid Compiler: Write a utility that queries the nodes and edges tables and assembles a valid Mermaid.js string.

Visualizer: A Web UI using mermaid.js or @mermaid-js/mermaid-react to render graphs.

Logic Toggle: Implement a "State Toggle" to hide/show dalil_source (evidence) and raw_excerpt (text audit log) within the graph view.

# Part C: The SQLite <--> Mermaid Editor:

Build a dual-pane editor:

Left Side: Live Mermaid text editor.

Right Side: Live SVG rendering.

The Sync Bridge: On save, the system must parse the Mermaid text to identify new/deleted relationships and sync them back to the nodes and edges SQL tables. For the Sync Bridge, implement a deterministic parser. Each node in the Mermaid text should follow a naming convention like NodeID[Label]. The parser must perform a 'diff' between the current SQL state and the edited Mermaid text:

Upsert nodes found in text.

Create edges for all --> connections.

Soft-delete nodes/edges in SQL that were removed from the Mermaid editor.

# Part D: The "Struggle" & Review System:

A dashboard that pulls nodes from the neural_lock table based on "Next Review Date."

Priority rendering for nodes tagged as 'Struggle'.

The "Blank Page" Mode: A feature where a graph is rendered with hidden labels, requiring the user to "fill in the circuit" mentally before revealing.

Make a prompts directory and seed the prompts as text files, then read them
