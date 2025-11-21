# Import All Results

```mermaid
flowchart TD
    A["Start importAllResultsStream"] --> B{"Fetch Event & Tournaments"}
    B --> C["Start Progress Tracker"]
    C --> D["Loop Tournaments"]
    D --> E{"Check Format"}

    E -- "skins" --> F["processSkinsResults"]
    E -- "user_scored" --> G["processProxyResults"]
    E -- "stroke" --> H["processStrokeResults"]
    E -- "team" --> I["processTeamResults"]
    E -- "quota" --> J["processQuotaResults"]
    E -- "points/scores/other" --> K["Skip"]

    F --> L["Aggregate Result"]
    G --> L
    H --> L
    I --> L
    J --> L
    K --> L

    L --> M["Emit Progress"]
    M --> N{"More Tournaments?"}
    N -- "Yes" --> D
    N -- "No" --> O["Complete Operation"]
```

## Supported Tournament Formats

### Quota Tournaments
Quota tournaments involve players competing against a preset quota or handicap-adjusted target score. Results import:

- **Position**: Player's finishing position
- **Score**: The quota result (e.g., "+2", "-1", "0") representing strokes over/under quota
- **Purse**: Money awarded based on performance
- **Summary**: Formatted as "Quota score: [score]" for display

Supports standard tournament result fields: position, score, amount, etc., with quota-specific score handling in the summary field.
