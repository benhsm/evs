import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuPortal,
	DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu.tsx'
import { cssBundleHref } from '@remix-run/css-bundle'
import {
	json,
	type DataFunctionArgs,
	type HeadersFunction,
	type LinksFunction,
	type V2_MetaFunction,
} from '@remix-run/node'
import {
	Form,
	Link,
	Links,
	LiveReload,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	useLoaderData,
	useSubmit,
} from '@remix-run/react'
import { withSentry } from '@sentry/remix'
import { ThemeSwitch, useTheme } from './routes/resources+/theme/index.tsx'
import { getTheme } from './routes/resources+/theme/theme-session.server.ts'
import fontStylestylesheetUrl from './styles/font.css'
import tailwindStylesheetUrl from './styles/tailwind.css'
import { authenticator, getUserId } from './utils/auth.server.ts'
import { ClientHintCheck, getHints } from './utils/client-hints.tsx'
import { prisma } from './utils/db.server.ts'
import { getEnv } from './utils/env.server.ts'
import { Button } from '~/components/ui/button.tsx'
import { combineHeaders, getDomainUrl, getUserImgSrc } from './utils/misc.ts'
import { useNonce } from './utils/nonce-provider.ts'
import { makeTimings, time } from './utils/timing.server.ts'
import { useOptionalUser, useUser } from './utils/user.ts'
import { useRef } from 'react'
import { Icon, href as iconsHref } from './components/ui/icon.tsx'
import { Confetti } from './components/confetti.tsx'
import { getFlashSession } from './utils/flash-session.server.ts'
import { useToast } from './utils/useToast.tsx'
import { Toaster } from './components/ui/toaster.tsx'

export const links: LinksFunction = () => {
	return [
		// Preload svg sprite as a resource to avoid render blocking
		{ rel: 'preload', href: iconsHref, as: 'image' },
		// Preload CSS as a resource to avoid render blocking
		{ rel: 'preload', href: fontStylestylesheetUrl, as: 'style' },
		{ rel: 'preload', href: tailwindStylesheetUrl, as: 'style' },
		cssBundleHref ? { rel: 'preload', href: cssBundleHref, as: 'style' } : null,
		{ rel: 'mask-icon', href: '/favicons/mask-icon.svg' },
		{
			rel: 'alternate icon',
			type: 'image/png',
			href: '/favicons/favicon-32x32.png',
		},
		{ rel: 'apple-touch-icon', href: '/favicons/apple-touch-icon.png' },
		{ rel: 'manifest', href: '/site.webmanifest' },
		{ rel: 'icon', type: 'image/svg+xml', href: '/favicons/favicon.svg' },
		{
			rel: 'icon',
			type: 'image/svg+xml',
			href: '/favicons/favicon-dark.svg',
			media: '(prefers-color-scheme: dark)',
		},
		{ rel: 'stylesheet', href: fontStylestylesheetUrl },
		{ rel: 'stylesheet', href: tailwindStylesheetUrl },
		cssBundleHref ? { rel: 'stylesheet', href: cssBundleHref } : null,
	].filter(Boolean)
}

export const meta: V2_MetaFunction = () => {
	return [
		{ title: 'The Barn - Volunteer Portal' },
		{ name: 'description', content: 'Equestrian Volunteer Coordinator' },
	]
}

export async function loader({ request }: DataFunctionArgs) {
	const timings = makeTimings('root loader')
	const userId = await time(() => getUserId(request), {
		timings,
		type: 'getUserId',
		desc: 'getUserId in root',
	})

	const user = userId
		? await time(
				() =>
					prisma.user.findUnique({
						where: { id: userId },
						select: {
							id: true,
							name: true,
							username: true,
							imageId: true,
							roles: true,
						},
					}),
				{ timings, type: 'find user', desc: 'find user in root' },
		  )
		: null
	if (userId && !user) {
		console.info('something weird happened')
		// something weird happened... The user is authenticated but we can't find
		// them in the database. Maybe they were deleted? Let's log them out.
		await authenticator.logout(request, { redirectTo: '/' })
	}
	const { flash, headers: flasHeaders } = await getFlashSession(request)

	return json(
		{
			user,
			requestInfo: {
				hints: getHints(request),
				origin: getDomainUrl(request),
				path: new URL(request.url).pathname,
				session: {
					theme: await getTheme(request),
				},
			},
			ENV: getEnv(),
			flash,
		},
		{
			headers: combineHeaders(
				new Headers({ 'Server-Timing': timings.toString() }),
				flasHeaders,
			),
		},
	)
}

export const headers: HeadersFunction = ({ loaderHeaders }) => {
	const headers = {
		'Server-Timing': loaderHeaders.get('Server-Timing') ?? '',
	}
	return headers
}

function App() {
	const data = useLoaderData<typeof loader>()
	const nonce = useNonce()
	const user = useOptionalUser()
	const theme = useTheme()
	useToast(data.flash?.toast)

	const userIsAdmin = user?.roles.find(role => role.name === 'admin')

	let nav = (
		<Button asChild variant="default">
			<Link to="/login">Log In</Link>
		</Button>
	)
	if (user) {
		nav = (
			<div className="flex grow items-center justify-between gap-1 sm:justify-end">
				<div className="flex items-center justify-start gap-1">
					<Button asChild className="px-4" variant="default">
						<Link to="/calendar" className="flex gap-2">
							<Icon className="text-body-md" name="calendar" />
							<span className="xsm:inline hidden">Calendar</span>
						</Link>
					</Button>
					{userIsAdmin ? <AdminDropdown /> : null}
				</div>
				<div className="shrink-0">
					<UserDropdown />
				</div>
			</div>
		)
	}

	return (
		<html lang="en" className={`${theme} h-full`}>
			<head>
				<ClientHintCheck nonce={nonce} />
				<Meta />
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width,initial-scale=1" />
				<Links />
			</head>
			<body className="flex h-full flex-col justify-between bg-background text-foreground">
				<header className="container mx-auto py-6">
					<nav className="flex justify-center sm:justify-between">
						<Link to="/" className="hidden sm:block">
							<div className="font-light">Equestrian</div>
							<div className="font-bold">Volunteer Scheduler</div>
						</Link>
						{nav}
					</nav>
				</header>

				<div className="flex-1">
					<Outlet />
				</div>

				<div className="container mx-auto flex justify-between">
					<Link to="/">
						<div className="font-light">Equestrian</div>
						<div className="font-bold">Volunteer Scheduler</div>
					</Link>
					<div className="flex items-center justify-start gap-1">
						<Link to="/tos" className="mr-2 text-sm">
							Terms of Service
						</Link>
						<Link to="/privacy" className="text-sm">
							Privacy Policy
						</Link>
					</div>

					<ThemeSwitch userPreference={data.requestInfo.session.theme} />
				</div>

				<div className="h-5" />
				<Confetti confetti={data.flash?.confetti} />
				<Toaster />
				<ScrollRestoration nonce={nonce} />
				<Scripts nonce={nonce} />
				<script
					nonce={nonce}
					dangerouslySetInnerHTML={{
						__html: `window.ENV = ${JSON.stringify(data.ENV)}`,
					}}
				/>
				<LiveReload nonce={nonce} />
			</body>
		</html>
	)
}
export default withSentry(App)

function UserDropdown() {
	const user = useUser()
	const submit = useSubmit()
	const formRef = useRef<HTMLFormElement>(null)
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button asChild variant="secondary" className="gap-2 px-2">
					<Link
						to={`/settings/profile`}
						// this is for progressive enhancement
						onClick={e => e.preventDefault()}
					>
						<img
							className="h-8 w-8 rounded-full object-cover"
							alt={user.name ?? user.username}
							src={getUserImgSrc(user.imageId)}
						/>
						<span className="hidden text-body-sm font-bold sm:inline">
							{user.name ?? user.username}
						</span>
					</Link>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuPortal>
				<DropdownMenuContent sideOffset={8} align="start">
					<DropdownMenuItem asChild>
						<Link prefetch="intent" to={`/users/${user.username}`}>
							<Icon className="text-body-md" name="avatar">
								Profile
							</Icon>
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem
						asChild
						// this prevents the menu from closing before the form submission is completed
						onSelect={event => {
							event.preventDefault()
							submit(formRef.current)
						}}
					>
						<Form action="/logout" method="POST" ref={formRef}>
							<button type="submit">
								<Icon className="text-body-md" name="exit">
									Logout
								</Icon>
							</button>
						</Form>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenuPortal>
		</DropdownMenu>
	)
}

function AdminDropdown() {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button asChild variant="secondary" className="gap-2">
					<Link
						to="/admin/users"
						// this is for progressive enhancement
						onClick={e => e.preventDefault()}
					>
						<Icon className="text-body-md" name="gear" />
						<span className="text-body-sm font-bold">Admin</span>
					</Link>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuPortal>
				<DropdownMenuContent sideOffset={8} align="start">
					<DropdownMenuItem asChild>
						<Link prefetch="intent" to={`/admin/users`}>
							<Icon className="text-body-md" name="person">
								Users
							</Icon>
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem asChild>
						<Link prefetch="intent" to={`/admin/horses`}>
							<Icon className="text-body-md" name="horse">
								Horses
							</Icon>
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem asChild>
						<Link prefetch="intent" to={`/admin/email`}>
							<Icon className="text-body-md" name="email">
								Email
							</Icon>
						</Link>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenuPortal>
		</DropdownMenu>
	)
}
