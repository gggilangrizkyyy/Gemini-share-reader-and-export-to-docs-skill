# Gemini-share-reader-and-export-to-docs-skill
Share your gemini chat session link to your agent, and transform it to .docs summary

What It Solves:
Dynamic SPA Rendering: Overcomes the limitation where standard HTTP fetchers (curl, urllib, read_url_content) only return empty HTML shells.

Cross-Origin Redirect Handling: Pre-resolves share.gemini.google/<id> redirects before browser attachment to prevent CDP session dropouts.

End-to-End Workflow: Renders full conversation text, parses structured Q&A / study materials, and exports them directly into Google Docs–ready .docx files.
