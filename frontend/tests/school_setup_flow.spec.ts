import { test, expect } from '@playwright/test';

test.describe('School Setup Flow', () => {
    test('Super admin creates school & logs in as school admin to provision everything', async ({ page }) => {
        // Unique identifiers for this test run
        const uniqueId = Date.now().toString().substring(5);
        const schoolName = `Automation School ${uniqueId}`;
        const adminUsername = `auto_admin_${uniqueId}`;
        const teacher1 = `teacher_a_${uniqueId}`;
        const teacher2 = `teacher_b_${uniqueId}`;

        // 1. Loqin as Superadmin
        console.log('Logging in as superadmin...');
        await page.goto('/login');
        await page.getByPlaceholder('Enter your username').fill('superadmin');
        await page.getByPlaceholder('••••••••').fill('password123');
        await page.getByRole('button', { name: 'Sign in' }).click();
        await expect(page).toHaveURL(/.*\/super-admin/);

        // 2. Create a School
        console.log('Creating a new school...');
        await page.getByRole('link', { name: 'Schools' }).click();
        await page.getByRole('button', { name: 'Add New School' }).click();

        await page.getByPlaceholder('e.g. Springfield International High School').fill(schoolName);
        await page.getByPlaceholder('Enter full address...').fill('123 Automation Way');

        // Select Country, Curriculum, School Type
        await page.locator('select').nth(0).selectOption({ index: 1 }); // Country
        // Wait for curriculums/types to load cascade
        await page.waitForTimeout(500);
        await page.locator('select').nth(1).selectOption({ index: 1 }); // Curriculum
        await page.locator('select').nth(2).selectOption({ index: 1 }); // School Type

        // 3. Create a School Admin inline
        console.log('Adding School Admin to school...');
        await page.getByPlaceholder('Username').fill(adminUsername);
        await page.getByPlaceholder('Password').fill('password123');
        await page.getByRole('button', { name: 'Add', exact: true }).click();

        // Save entire School form
        await page.getByRole('button', { name: 'Create School' }).click();

        // Expect success toast
        await expect(page.getByText('School created successfully').first()).toBeVisible();

        // 4. Logout
        console.log('Logging out of superadmin...');
        await page.getByRole('button', { name: 'Logout' }).first().click();
        await expect(page).toHaveURL(/.*\/login/);

        // 5. Login as the NEW School Admin
        console.log(`Logging in as school admin: ${adminUsername}...`);
        await page.getByPlaceholder('Enter your username').fill(adminUsername);
        await page.getByPlaceholder('••••••••').fill('password123');
        await page.getByRole('button', { name: 'Sign in' }).click();
        await expect(page).toHaveURL(/.*\/school-admin/);

        // 6. Create Grade 10
        console.log('Creating Grade...');
        await page.getByRole('link', { name: 'Grades' }).click();
        await page.getByRole('button', { name: '+ Add Grade' }).click();
        await page.getByPlaceholder('e.g. Grade 1').fill('Grade 10');
        await page.locator('form').getByRole('button', { name: 'Add Grade' }).click();
        await expect(page.getByText('Grade 10').first()).toBeVisible();

        // 6.5 Create Subjects
        console.log('Creating Subjects...');
        await page.getByRole('link', { name: 'Subjects' }).click();

        await page.getByRole('button', { name: '+ Add Subject' }).click();
        await page.getByPlaceholder('Subject Name (e.g. Math)').fill('Physics');
        await page.getByPlaceholder('Code (e.g. MATH101)').fill('PHY101');
        await page.locator('form').getByRole('button', { name: 'Add' }).click();
        await page.waitForTimeout(500);

        await page.getByRole('button', { name: '+ Add Subject' }).click();
        await page.getByPlaceholder('Subject Name (e.g. Math)').fill('Chemistry');
        await page.getByPlaceholder('Code (e.g. MATH101)').fill('CHE101');
        await page.locator('form').getByRole('button', { name: 'Add' }).click();
        await page.waitForTimeout(500);

        // 7. Create Classes (10-A, 10-B)
        console.log('Creating Classes...');
        await page.getByRole('link', { name: 'Classes' }).click();

        // Create 10 A
        await page.getByRole('button', { name: '+ Add New Class' }).click();
        await page.locator('input[placeholder="e.g. 10-A"]').fill('10 A');
        await page.locator('select').first().selectOption({ label: 'Grade 10' });
        await page.locator('input[placeholder="e.g. A"]').fill('A');
        await page.getByRole('button', { name: 'Create Class' }).click();
        await expect(page.getByText('Class created successfully').first()).toBeVisible();
        await page.waitForTimeout(500); // UI breathing room

        // Create 10 B
        await page.getByRole('button', { name: '+ Add New Class' }).click();
        await page.locator('input[placeholder="e.g. 10-A"]').fill('10 B');
        await page.locator('select').first().selectOption({ label: 'Grade 10' });
        await page.locator('input[placeholder="e.g. A"]').fill('B');
        await page.getByRole('button', { name: 'Create Class' }).click();
        await expect(page.getByText('Class created successfully').first()).toBeVisible();

        // 8. Create Teachers
        console.log('Creating Teachers...');
        await page.getByRole('link', { name: 'Teachers' }).click();

        // Teacher 1
        await page.getByRole('button', { name: '+ Add Teacher' }).click();
        await page.getByPlaceholder('Username').fill(teacher1);
        await page.getByPlaceholder('Email').fill(`${teacher1}@test.com`);
        await page.getByRole('button', { name: 'Add', exact: true }).click();
        await expect(page.getByText('Teacher created successfully').first()).toBeVisible();
        await page.waitForTimeout(500);

        // Teacher 2
        await page.getByRole('button', { name: '+ Add Teacher' }).click();
        await page.getByPlaceholder('Username').fill(teacher2);
        await page.getByPlaceholder('Email').fill(`${teacher2}@test.com`);
        await page.getByRole('button', { name: 'Add', exact: true }).click();
        await expect(page.getByText('Teacher created successfully').first()).toBeVisible();

        // Assign Teachers to Classes
        console.log('Assigning Teachers to Classes...');
        await page.getByRole('link', { name: 'Classes' }).click();

        // Find 10 A row and assign teacher1
        await page.getByRole('row', { name: /10 A/ }).getByRole('button', { name: 'Assign Teacher' }).click();
        await page.locator('select').selectOption({ label: teacher1 });
        await page.getByRole('button', { name: 'Assign', exact: true }).click();
        await expect(page.getByText('Teacher assigned successfully').first()).toBeVisible();
        await page.waitForTimeout(500);

        // Find 10 B row and assign teacher2
        await page.getByRole('row', { name: /10 B/ }).getByRole('button', { name: 'Assign Teacher' }).click();
        await page.locator('select').selectOption({ label: teacher2 });
        await page.getByRole('button', { name: 'Assign', exact: true }).click();
        await expect(page.getByText('Teacher assigned successfully').first()).toBeVisible();

        // Assign Subjects back to Teachers for these classes
        console.log('Assigning Subjects to Class Teachers...');
        await page.getByRole('link', { name: 'Teachers' }).click();

        // Teacher 1 -> 10 A -> Physics
        await page.getByRole('row', { name: teacher1 }).getByRole('button', { name: 'Change class' }).click();
        await page.getByRole('button', { name: '+ Assign New Class' }).click();
        await page.locator('select').first().selectOption({ label: 'Grade 10' });
        await page.locator('select').nth(1).selectOption({ label: '10 A (A)' });
        await page.locator('select').nth(2).selectOption({ label: 'Physics (PHY101)' });
        await page.locator('form').getByRole('button', { name: 'Assign' }).click();
        await page.waitForTimeout(500);

        await page.getByRole('button', { name: '← Back to Teachers' }).click();

        // Teacher 2 -> 10 B -> Chemistry
        await page.getByRole('row', { name: teacher2 }).getByRole('button', { name: 'Change class' }).click();
        await page.getByRole('button', { name: '+ Assign New Class' }).click();
        await page.locator('select').first().selectOption({ label: 'Grade 10' });
        await page.locator('select').nth(1).selectOption({ label: '10 B (B)' });
        await page.locator('select').nth(2).selectOption({ label: 'Chemistry (CHE101)' });
        await page.locator('form').getByRole('button', { name: 'Assign' }).click();
        await page.waitForTimeout(500);

        // 9. Add Students
        console.log('Adding Students...');
        await page.getByRole('link', { name: 'Students' }).click();

        // 3 students for 10 A
        for (let i = 1; i <= 3; i++) {
            await page.getByRole('button', { name: '+ Add Student' }).click();
            await page.getByPlaceholder('e.g. John Doe').fill(`Student ${i} Class A`);
            await page.getByPlaceholder('student@example.com').fill(`student${i}_a_${uniqueId}@example.com`);
            await page.locator('select').first().selectOption({ label: 'Grade 10' });
            await page.waitForTimeout(200); // let cascade settle
            await page.locator('select').nth(1).selectOption({ label: '10 A (A)' });
            await page.getByRole('button', { name: 'Create Student' }).click();
            await expect(page.getByText('Student created successfully!').first()).toBeVisible();
            await page.waitForTimeout(300);
        }

        // 3 students for 10 B
        for (let i = 1; i <= 3; i++) {
            await page.getByRole('button', { name: '+ Add Student' }).click();
            await page.getByPlaceholder('e.g. John Doe').fill(`Student ${i} Class B`);
            await page.getByPlaceholder('student@example.com').fill(`student${i}_b_${uniqueId}@example.com`);
            await page.locator('select').first().selectOption({ label: 'Grade 10' });
            await page.waitForTimeout(200); // let cascade settle
            await page.locator('select').nth(1).selectOption({ label: '10 B (B)' });
            await page.getByRole('button', { name: 'Create Student' }).click();
            await expect(page.getByText('Student created successfully!').first()).toBeVisible();
            await page.waitForTimeout(300);
        }

        console.log('Test completed successfully!');
    });
});
