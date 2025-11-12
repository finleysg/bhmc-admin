# Reporting Endpoints

## Data

- The report service MAY query all tables directly (readonly), so a reference to the drizzle service is encouraged.
- The report service MUST NOT mutate data.

## Sorting

- Reports MUST have an explicit default sort order.
- Report endpoints SHOULD support sorting. Ask the user if it's not clear what fields should be sortable.

## Paging

- Reports MUST support paging.
- Reports MUST have a default page size. Use 100 if not provided.
- Reports MUST take a page size argument to override the default.

## Filtering

- Reports SHOULD support optional filtering. Ask the user if it's not clear what fields should be filterable.
