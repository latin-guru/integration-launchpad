// One end-to-end run of the demo: map the last field, send the test events,
// watch the go-live gate turn green, and download the integration doc.
// It also saves the README screenshots into docs/screenshots/.
import { expect, test } from '@playwright/test';

// animations: 'disabled' finishes CSS transitions, so the gate light is captured in its final colour.
const shot = (name) => ({
  path: `docs/screenshots/${name}.png`,
  fullPage: false,
  animations: 'disabled',
});

test('map, test, go live, and export the integration doc', async ({ page }) => {
  const nav = page.getByRole('navigation', { name: 'Implementation steps' });
  await page.goto('./#/projects');
  await expect(page.getByTestId('project-card')).toContainText('Juniper & Moss');
  await expect(page.getByTestId('sidebar-gate')).toContainText('Not ready for go-live');

  // Discovery: refunds = yes adds the reversal task and test case.
  await nav.getByRole('link', { name: 'Discovery' }).click();
  await page
    .getByRole('group', { name: 'Do refunds need to reverse partner commissions?' })
    .getByLabel('Yes')
    .check();
  await expect(page.getByTestId('scope-effects')).toContainText(
    'TC-5: A refund arrives as an accepted reversal',
  );

  // Mapping: the one required field left is amount (total_price, in cents).
  await nav.getByRole('link', { name: 'Mapping' }).click();
  await expect(page.getByTestId('mapping-status')).toContainText('Not mapped yet: amount');
  await page.getByLabel('Source for amount').selectOption('order.total_price');
  await page.getByLabel('Transform for amount').selectOption('toCents');
  await expect(page.getByTestId('field-amount')).toContainText('Sends: 8450');
  await expect(page.getByTestId('mapping-status')).toContainText('All required fields mapped');
  await expect(page.getByTestId('sidebar-gate')).toContainText('Mapping done, 5 tests to run');
  await page.screenshot(shot('mapping'));

  // Test Console: a good event, then each failure case.
  await nav.getByRole('link', { name: 'Test Console' }).click();
  const result = page.getByTestId('latest-result');
  await page.getByRole('button', { name: /Send good event/ }).click();
  await expect(result).toContainText('EV-1 accepted');
  await page.getByRole('button', { name: /Send refund reversal/ }).click();
  await expect(result).toContainText('EV-2 accepted');
  await page.getByRole('button', { name: /Send duplicate/ }).click();
  await expect(result).toContainText('EV-3 rejected');
  await page.getByRole('button', { name: /Send bad currency/ }).click();
  await expect(result).toContainText('EV-4 rejected');
  await page.getByRole('button', { name: /Send bad signature/ }).click();
  await expect(result).toContainText('EV-5 rejected');
  await expect(result).toContainText('Escalate if it persists');
  await expect(result).toContainText('Recorded as evidence for TC-4: passed');
  await expect(page.getByTestId('sidebar-gate')).toContainText('Ready for go-live');
  await expect(page.getByTestId('sidebar-gate')).toHaveClass(/is-ready/);
  await page.screenshot(shot('test-console-failure'));

  // Go-live: every required test passed, so the gate is green.
  await nav.getByRole('link', { name: /Go-live$/ }).click();
  await expect(page.getByTestId('readiness-gate')).toContainText('Ready for go-live');
  await expect(page.getByTestId('sidebar-gate')).toContainText('Ready for go-live');
  await page.screenshot(shot('go-live'));

  // Docs: the integration doc reflects the mapping and evidence, and downloads.
  await nav.getByRole('link', { name: 'Docs' }).click();
  const preview = page.getByTestId('doc-preview');
  await expect(preview).toContainText(
    '| `amount` | integer | Yes | `order.total_price` | toCents |',
  );
  await expect(preview).toContainText('Ready: every required field is mapped');
  await page.screenshot(shot('integration-doc'));

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Download Integration doc/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('juniper-moss-integration-doc.md');

  // The workspace survives a reload (localStorage), and Reset demo clears it.
  await page.reload();
  await expect(page.getByTestId('sidebar-gate')).toContainText('Ready for go-live');
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.getByTestId('sidebar-gate')).toContainText('Not ready for go-live');
});
