import { test, expect } from '@playwright/test';

test.describe.serial('일정 등록 흐름 테스트', () => {
  test.beforeEach(async ({ request, page }) => {
    await request.post('http://localhost:3000/__reset');
    await page.goto('http://localhost:5173');
  });

  test('사용자는 일정을 등록한 직후 삭제할 수 있다', async ({ page }) => {
    const listItems = page.locator('[data-testid="event-list"] > *');
    const initialCount = await listItems.count();

    // 일정 등록
    await page.getByRole('textbox', { name: '제목' }).fill('회의 준비');
    await page.getByRole('textbox', { name: '날짜' }).fill('2025-05-08');
    await page.getByRole('textbox', { name: '시작 시간' }).fill('09:00');
    await page.getByRole('textbox', { name: '종료 시간' }).fill('10:00');
    await page.getByTestId('event-submit-button').click();

    // 바로 삭제
    await page
      .getByTestId('event-item')
      .filter({ hasText: '회의 준비' })
      .getByLabel('Delete event')
      .click();

    // 리스트가 다시 원래 개수로 돌아왔는지 확인
    await expect(listItems).toHaveCount(initialCount);
  });

  test('사용자는 하루에 여러 일정을 등록하고, 그 중 하나를 수정할 수 있다', async ({ page }) => {
    // 일정 1 등록
    await page.getByRole('textbox', { name: '제목' }).fill('아침 운동');
    await page.getByRole('textbox', { name: '날짜' }).fill('2025-05-07');
    await page.getByRole('textbox', { name: '시작 시간' }).fill('07:00');
    await page.getByRole('textbox', { name: '종료 시간' }).fill('08:00');
    await page.getByTestId('event-submit-button').click();

    // 일정 2 등록
    await page.getByRole('textbox', { name: '제목' }).click();
    await page.getByRole('textbox', { name: '제목' }).fill('저녁 약속');
    await page.getByRole('textbox', { name: '날짜' }).fill('2025-05-07');
    await page.getByRole('textbox', { name: '시작 시간' }).fill('19:00');
    await page.getByRole('textbox', { name: '종료 시간' }).fill('20:00');
    await page.getByTestId('event-submit-button').click();

    // '저녁 약속' 수정
    await page
      .getByTestId('event-item')
      .filter({ hasText: '저녁 약속' })
      .getByLabel('Edit event')
      .click();
    await page.getByRole('textbox', { name: '제목' }).fill('저녁 식사');
    await page.getByTestId('event-submit-button').click();

    await page.waitForTimeout(1000);
    // 검증: '아침 운동'은 그대로, '저녁 식사'로 변경됨
    await expect(page.getByTestId('event-item').filter({ hasText: '아침 운동' })).toHaveCount(1);

    await expect(page.getByTestId('event-item').filter({ hasText: '저녁 식사' })).toHaveCount(1);
  });

  test('일정 추가 → 수정 → 삭제가 event-list에 반영되는지 확인', async ({ page }) => {
    const listItems = page.locator('[data-testid="event-list"] > *');
    const initialCount = await listItems.count();

    // 일정 추가
    await page.getByRole('textbox', { name: '제목' }).fill('테스트');
    await page.getByRole('textbox', { name: '날짜' }).fill('2025-05-04');
    await page.getByRole('textbox', { name: '시작 시간' }).fill('13:02');
    await page.getByRole('textbox', { name: '종료 시간' }).fill('14:04');
    await page.getByTestId('event-submit-button').click();

    // 일정이 추가되었는지 확인 (전체 수 +1)
    await expect(listItems).toHaveCount(initialCount + 1);

    // '테스트'라는 제목을 가진 항목이 존재하는지 확인
    await expect(page.getByTestId('event-item').filter({ hasText: '테스트' })).toHaveCount(1);

    // 일정 수정
    await page
      .getByTestId('event-item')
      .filter({ hasText: '테스트' })
      .getByLabel('Edit event')
      .click();

    await page.getByRole('textbox', { name: '제목' }).fill('테스트-수정');
    await page.getByTestId('event-submit-button').click();

    // '테스트-수정'이라는 제목이 리스트에 있는지 확인
    await expect(page.getByTestId('event-item').filter({ hasText: '테스트-수정' })).toHaveCount(1);

    // 일정 삭제
    await page
      .getByTestId('event-item')
      .filter({ hasText: '테스트-수정' })
      .getByLabel('Delete event')
      .click();

    // 다시 리스트 길이가 initialCount로 돌아왔는지 확인
    await expect(listItems).toHaveCount(initialCount);
  });
});
