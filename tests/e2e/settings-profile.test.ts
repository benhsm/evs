import { faker } from '@faker-js/faker'
import { expect, insertNewUser, test } from '../playwright-utils.ts'
import { createUser } from '../../tests/db-utils.ts'
import { verifyLogin } from '~/utils/auth.server.ts'

test('Users can update their basic info', async ({ login, page }) => {
	await login()
	await page.goto('/settings/profile')

	const newUserData = createUser()

	await page.getByRole('textbox', { name: /^name/i }).fill(newUserData.name)
	await page
		.getByRole('textbox', { name: /^username/i })
		.fill(newUserData.username)
	// TODO: support changing the email... probably test this in another test though
	// await page.getByRole('textbox', {name: /^email/i}).fill(newUserData.email)

	await page.getByRole('button', { name: /^save/i }).click()

	await expect(page).toHaveURL(`/users/${newUserData.username}`)
})

test('Users can update their password', async ({ login, page }) => {
	const oldPassword = faker.internet.password()
	const newPassword = faker.internet.password()
	const user = await insertNewUser({ password: oldPassword })
	await login(user)
	await page.goto('/settings/profile')

	const fieldset = page.getByRole('group', { name: /change password/i })

	await fieldset
		.getByRole('textbox', { name: /^current password/i })
		.fill(oldPassword)
	await fieldset
		.getByRole('textbox', { name: /^new password/i })
		.fill(newPassword)

	await page.getByRole('button', { name: /^save/i }).click()

	await expect(page).toHaveURL(`/users/${user.username}`)

	expect(
		await verifyLogin(user.username, oldPassword),
		'Old password still works',
	).toEqual(null)
	expect(
		await verifyLogin(user.username, newPassword),
		'New password does not work',
	).toEqual({ id: user.id })
})

test('Users can update their profile photo', async ({ login, page }) => {
	const user = await login()
	await page.goto('/settings/profile')

	const beforeSrc = await page
		.getByAltText(user.name ?? user.username)
		.getAttribute('src')

	await page.getByRole('link', { name: /change profile photo/i }).click()

	await expect(page).toHaveURL(`/settings/profile/photo`)

	await page
		.getByRole('dialog', { name: /profile photo/i })
		.getByLabel(/change/i)
		.setInputFiles('./tests/fixtures/test-profile.jpg')

	await page
		.getByRole('dialog', { name: /profile photo/i })
		.getByRole('button', { name: /save/i })
		.click()

	await expect(
		page,
		'Was not redirected after saving the profile photo',
	).toHaveURL(`/settings/profile`)

	const afterSrc = await page
		.getByAltText(user.name ?? user.username)
		.getAttribute('src')

	expect(beforeSrc).not.toEqual(afterSrc)
})

test('Users can edit and view height with proper validations', async ({
	login,
	page,
}) => {
	await login()
	await page.goto('/settings/profile')

	// Validation: no negative numbers
	await page.getByLabel('feet').fill('-1')
	await page.getByRole('button', { name: 'Save changes' }).click()
	await expect(page.getByText('Feet must be between 0 and 8')).toBeVisible()

	// Validation: no text allowed
	await page.getByLabel('feet').fill('text not allowed')
	await page.getByRole('button', { name: 'Save changes' }).click()
	await expect(page.getByText('Feet must be a number')).toBeVisible()

	// Validation: must have both feet and inches
	await page.getByLabel('feet').fill('')
	await page.getByLabel('inches').fill('6')
	await page.getByRole('button', { name: 'Save changes' }).click()
	await expect(
		page.getByText('You must enter both feet and inches for height'),
	).toBeVisible()

	// Heights are saved to database and displayed
	await page.getByLabel('feet').fill('4')
	await page.getByLabel('inches').fill('5')
	await page.getByRole('button', { name: 'Save changes' }).click()
	await page.goto('/settings/profile')

	await expect(page.getByLabel('feet')).toHaveValue('4')
	await expect(page.getByLabel('inches')).toHaveValue('5')

	// Blank values are saved as null
	await page.getByLabel('feet').fill('')
	await page.getByLabel('inches').fill('')
	await page.getByRole('button', { name: 'Save' }).click()

	await page.goto('/settings/profile')

	await expect(page.getByLabel('feet')).toHaveValue('')
	await expect(page.getByLabel('inches')).toHaveValue('')
})

test('Users can edit their years of experience with proper validation', async ({
	login,
	page,
}) => {
	await login()
	await page.goto('/settings/profile')

	// Validation: no negative numbers
	await page.getByLabel(/years of experience/i).fill('-1')
	await page.getByRole('button', { name: 'Save changes' }).click()
	await expect(
		page.getByText('Number must be greater than or equal to 0'),
	).toBeVisible()

	// Validation: Text not allowed
	await page.getByLabel(/years of experience/i).fill('text not allowed')
	await page.getByRole('button', { name: 'Save changes' }).click()
	await expect(page.getByText('Must input valid number')).toBeVisible()

	// Heights are saved to database and displayed
	await page.getByLabel(/years of experience/i).fill('4')
	await page.getByRole('button', { name: 'Save changes' }).click()
	await page.goto('/settings/profile')
	await expect(page.getByLabel(/years of experience/i)).toHaveValue('4')

	// Blank values are saved as null
	await page.getByLabel(/years of experience/i).fill('')
	await page.getByRole('button', { name: 'Save' }).click()
	await page.goto('/settings/profile')
	await expect(page.getByLabel(/years of experience/i)).toHaveValue('')
})
