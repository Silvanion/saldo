# Saldo — Sprint 10 Handoff Summary

## Sprint

**Sprint 10: Saved Payoff Scenario Rename & Duplicate v1**

**Status:** Completed and committed

**Commit:** `b4fb529 feat(debts): add rename and duplicate actions for saved payoff scenarios`

## Scope

Sprint 10 extended the existing saved payoff scenarios area with two local management actions:

- renaming an existing saved payoff scenario,
- duplicating an existing saved payoff scenario as a new variant.

The sprint stayed within the debts UI. It did not modify payoff calculation logic, the saved scenario schema, refinance logic, or unrelated application modules.

## Implemented Features

### Rename scenario

Each saved scenario now exposes a **Zmień nazwę** action.

The action opens a dedicated rename modal with the current scenario name prefilled. The user can edit the name and save or cancel the operation.

On save:

- the scenario identity is preserved,
- `name` is updated,
- the existing strategy remains unchanged,
- `extraMonthlyPayment` remains unchanged,
- `customDebtOrder` remains unchanged,
- `createdAt` remains unchanged,
- `updatedAt` is updated where supported by the existing flow.

The input uses a practical UI limit of 50 characters and prevents saving names that are empty after trimming. The saved value is trimmed before being submitted.

### Duplicate scenario

Each saved scenario now exposes a **Duplikuj** action.

The action opens a dedicated duplicate modal with a suggested name in the form:

```text
{oryginalna nazwa} — kopia
```

The user can adjust the suggested name before confirming.

On save, the duplicate:

- receives a new unique scenario identity through the existing save flow,
- preserves the original strategy,
- preserves `extraMonthlyPayment`,
- preserves `customDebtOrder` for Custom scenarios,
- is added as a separate saved scenario,
- appears in the existing scenarios list.

### Five-scenario limit

The existing safety limit of 5 saved scenarios is respected.

When the profile already contains 5 scenarios:

- duplicate actions are disabled,
- the UI exposes the reason through the existing title/disabled affordance,
- rename actions remain available.

## Changed Files

```text
src/components/debts/DebtsView.tsx
src/components/debts/DebtsView.test.tsx
```

No additional component file was created for Sprint 10.

## Accessibility

The implementation provides:

- accessible names for rename and duplicate buttons containing the scenario name,
- semantic modal/dialog structure,
- `role="dialog"`,
- `aria-modal="true"`,
- `aria-labelledby` pointing to modal headings,
- labelled form inputs,
- accessible close buttons,
- keyboard-accessible controls,
- visible focus styles.

## Responsive UX

The scenario action group remains usable on narrow screens, including 375 px layouts.

The rename and duplicate modals use responsive width and padding rules. Long scenario names can wrap safely and the flow does not introduce page-level horizontal overflow.

## Data Safety

The implementation does not mutate the original scenario collection directly.

Rename updates only the selected scenario fields required by the operation. Duplication creates a separate object through the existing save callback flow and preserves the source scenario's payoff configuration.

No new persistence model or schema field was introduced.

## Tests

Updated:

```text
src/components/debts/DebtsView.test.tsx
```

Covered flows include:

- opening the rename modal,
- prefilled rename input,
- submitting a renamed scenario,
- opening the duplicate modal,
- suggested duplicate name,
- preserving Custom strategy settings,
- preserving `customDebtOrder`,
- blocking duplication at the 5-scenario limit,
- keeping rename available at the limit.

## Validation

Reported validation results:

```text
Targeted tests: 50 passed
Full Vitest suite: 486 passed
Test files: 67 passed
TypeScript/lint: 0 errors
Production build: SUCCESS
```

Validation commands:

```bash
npx vitest run src/services/debtCalculations.test.ts src/components/debts/DebtsView.test.tsx
npm run lint
npm run build
npx vitest run
```

## Forbidden Files Verified Unchanged

The following files were intentionally left unchanged:

```text
src/services/debtCalculations.ts
src/services/debtCalculations.test.ts
src/types.ts
src/hooks/useAppActions.ts
src/components/debts/RefinanceComparisonModal.tsx
```

## Known Limitations

- Rename and duplicate are available only within the current saved-scenarios area.
- There are no folders, tags, search, bulk actions, import/export, or sharing.
- Sprint 10 does not compare calculated payoff timelines or produce charts.
- The five-scenario capacity remains unchanged.
- The flow depends on the existing profile update and persistence mechanism.

## Recommended Next Step

Before starting Sprint 11:

1. Keep the repository at commit `b4fb529` as the baseline.
2. Do not extend scenario management again without a clear product need.
3. Prefer a small acceptance pass or a separate user-facing improvement outside the scenario-management flow.
4. Preserve the rule that future debt sprints must avoid unnecessary changes to calculation services and data schemas.

## Suggested Sprint 11 Direction

A reasonable next direction is a small **Debt Simulator Acceptance & Polish Pass** focused on:

- validating the combined flow of Knowledge Center, comparison, rename, duplicate, load, and delete,
- improving any remaining microcopy or mobile spacing issues,
- adding only targeted regression tests,
- avoiding new product capabilities unless a concrete gap is found.
