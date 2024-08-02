import {
    dataCleanup,
    expect,
    test
} from '../playwright-utils.ts'
import { prisma } from '~/utils/db.server.ts'
import { getPasswordHash } from '~/utils/auth.server.ts'

test.describe('calendar', () => {
    const calendarIDs: string[] = []
    let user: any
    let password: string
    
    test.beforeAll(async () => {
        // create test user
        password = 'Test@123'
        user = await prisma.user.create({
            data: {
                username: 'testuser',
                name: 'test user',
                email: 'test@example.com',
                phone: '111-111-1111',
                birthdate: new Date(2000, 0, 1),
                height: 60,
                yearsOfExperience: 1,
                notes: `this is a test user created on ${new Date().toString()}`,
                password: {
                    create: {
                        hash: await getPasswordHash(password)
                    }
                }
            },
            select: {
                id: true,
                name: true,
                username: true,
                email: true
            }
        })

        dataCleanup.users.add(user.id)

        // create roles


    })

    test.beforeEach(async ({ page }) => {
        // log in
        await page.goto('/login')
        await page.getByRole('textbox', { name: /username/i })
        .fill(user.username)
        await page.getByLabel(/^password$/i).fill(password)
        await page.getByRole('button', { name: /log in/i })
        .click()
        await expect(page).toHaveURL(`/`)
        await page.goto('/calendar')
    })

    test.afterEach(async ({ page }) => {
        // log out
        await page.getByAltText(user.name!).click()
        await page.getByRole('button', { name: 'Logout' }).click()
        await expect(page.getByText('Log In')).toBeVisible()

        // clean up events
        if(calendarIDs.length) {
            await prisma.event.deleteMany({
                where: {
                    id: { in: calendarIDs }
                }
            })
        }
    })

    test('user calendar event registration', async ({ page }) => {
        // create event
        // register for calendar
        // check email sent to user
        // check email sent to all admins
        // unregister for event
    })
})