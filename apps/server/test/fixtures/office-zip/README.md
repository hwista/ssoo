# Office archive compatibility fixtures

Synthetic Korean document fixtures captured on 2026-09-11 from the pre-replacement server build using adm-zip 0.6.0. No user documents or credentials are included.

`baseline.json` records extraction results and SHA-256 hashes of each non-directory entry in generated and rendered Word documents. Tests use JSZip to read the frozen binaries and compare results, preserving an oracle independent of the new generator. Coverage includes split placeholders, headers, footers, notes, styles, images, embedded bytes, Korean filenames, numeric slide ordering, spreadsheets, and invalid inputs.

Keep these expected results independent of the implementation under test. Do not regenerate them merely to make a regression pass.
