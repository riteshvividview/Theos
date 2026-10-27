# Homepage-only cleanup — 27 October 2026

User authorized removing everything outside the current homepage before the initial GitHub push.

Kept all 15 active source files, homepage imagery/depth maps, fallback spiral image, three fonts and their licenses, favicon, build configuration, dependency lockfile and relevant redesign notes.

Removed the unused design-story route, legacy hero/particle scenes and their helpers, old CSS, unused demo font, model binaries, Blender/source files, old screenshots, scripts, raw PDF/DOCX/reference boards and three unused rendering dependencies. Files were moved rather than permanently deleted.

Local recovery archive: `.local-backups/cleanup-homepage-2026-10-27/`. `MOVED_FILES.txt` lists archived paths. The archive also contains pre-cleanup CSS, documentation and package files. Existing redesign snapshots remain untouched. These workstation-only recovery folders are deliberately excluded from Git; they are not present in a fresh clone.

The initial Git commit is the recovery baseline for the clean homepage. Git LFS is no longer required because no large binary source/model files remain in the project. Previous source paths mentioned in dated design notes are historical.
