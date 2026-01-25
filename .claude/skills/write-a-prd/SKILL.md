---
name: write-a-prd
description: Use this skill when writing a PRD for a feature.
---

This skill will be invoked when the user wants to create a PRD. You should go through the steps below. You may skip steps if you don't consider them necessary.

1. Ask the user for a detailed description of the problem they want to solve and any potential ideas for solutions.

2. Explore the repo to verify their assertions and understand the current state of the codebase.

3. Ask whether they have considered other options, and present other options to them.

4. Interview the user about the implementation. Be extremely detailed and thorough.

5. Hammer out the exact scope of the implementation. Work out what you plan to build and what you DON'T plan to build as part of this PRD.

6. Determine what tests are needed to validate the requirements. Have a bias towards pure functions that can be tested without mocks, but
   if service code or components have important logic, definitely include them in your test plan.

7. Once you have a complete understanding of the problem and solution, use the template below to write the PRD. The PRD should be written to the /plans directory.

<prd-template>

Break down the requirements into work items that can be completed in a single commit. Better to error on too small than too large.

Each item should have: category, description, steps to verify, and passes: false.

Be specific about acceptance criteria.

Write the PRD to a json file in the monorepo /plans directory.

</prd-template>
