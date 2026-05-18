import { runLint, LintIssue } from '../lint.js';

export async function vaultLint(vaultRoot: string, fix = false) {
  const issues = runLint(vaultRoot, fix);

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const fixed = issues.filter((i) => i.fixed);

  return {
    total: issues.length,
    errors: errors.length,
    warnings: warnings.length,
    fixed: fixed.length,
    issues,
  };
}
