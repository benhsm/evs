import { type LoaderArgs, json, useLoaderData, Outlet, Link } from '~/remix.ts'
import { prisma } from '~/utils/db.server.ts'
import { requireAdmin } from '~/utils/permissions.server.ts'
import { DataTable } from '~/components/ui/data_table.tsx'

import { type ColumnDef } from '@tanstack/react-table'
import { type User, type Role } from '@prisma/client'
import { formatRelative } from 'date-fns'
import { Icon } from '~/components/ui/icon.tsx'
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
} from '~/components/ui/dropdown-menu.tsx'
import { Button } from '~/components/ui/button.tsx'

export const loader = async ({ request }: LoaderArgs) => {
	await requireAdmin(request)
	return json(await prisma.user.findMany({ include: { roles: true } }))
}

export default function Users() {
	const data = useLoaderData<typeof loader>()
	return (
		<div>
			<h1 className="text-center text-5xl">Users</h1>
			<div className="container pt-10">
				<DataTable columns={columns} data={data} />
			</div>
			<Outlet />
		</div>
	)
}

type UserWithRole = User & { roles: Role[] }

export const columns: ColumnDef<UserWithRole>[] = [
	{
		accessorKey: 'email',
		header: 'email',
	},
	{
		accessorKey: 'name',
		header: 'name',
	},
	{
		accessorKey: 'phone',
		header: 'phone',
		cell: ({ row }) => {
			const s = row.getValue('phone') as string
			const formatted = s ? `${s.slice(0,3)}-${s.slice(3,6)}-${s.slice(6,10)}` : null
			return <div>{formatted}</div>
		}
	},
	{
		accessorKey: 'lastLogin',
		header: 'last login',
		cell: ({ row }) => {
			const timeStamp = new Date(row.getValue('lastLogin'))
			const formatted = formatRelative(timeStamp, new Date())
			return <div>{formatted}</div>
		},
	},
	{
		accessorKey: 'instructor',
		header: 'instructor',
		cell: ({ row }) => {
			return <div>{row.original.instructor ? 'Yes' : 'No'}</div>
		},
	},
	{
		accessorKey: 'roles',
		header: 'admin',
		cell: ({ row }) => {
			const isAdmin = row.original.roles.find(r => r.name == 'admin')
			return <div>{isAdmin ? 'Yes' : 'No'}</div>
		},
	},
	{
		accessorKey: 'roles',
		header: 'lesson assistant',
		enableResizing: true,
		maxSize: 1,
		cell: ({ row }) => {
			const hasRole = row.original.roles.find(r => r.name == 'lessonAssistant')
			return <div>{hasRole ? 'Yes' : 'No'}</div>
		},
	},
	{
		accessorKey: 'roles',
		header: 'horse leader',
		cell: ({ row }) => {
			const hasRole = row.original.roles.find(r => r.name == 'horseLeader')
			return <div>{hasRole ? 'Yes' : 'No'}</div>
		},
	},
	{
		id: 'actions',
		cell: ({ row }) => {
			const isAdmin = row.original.roles.find(r => r.name == 'admin')
			return (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" className="h-8 w-8 p-0">
							<span className="sr-only">Open menu</span>
							<Icon className="h-4 w-4" name="dots-vertical" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuLabel>Actions</DropdownMenuLabel>
						<DropdownMenuItem asChild>
							<Link to={`edit/${row.original.id}`} preventScrollReset>
								<Icon name="pencil-1">Edit</Icon>
							</Link>
						</DropdownMenuItem>
						<DropdownMenuItem asChild>
							<Link to={`delete/${row.original.id}`} preventScrollReset>
								<Icon name="trash">Delete</Icon>
							</Link>
						</DropdownMenuItem>
						<DropdownMenuSeparator className="mt-4 border" />
						<DropdownMenuItem>
							<Link
								to={`/admin/users/promote/${row.original.id}`}
								preventScrollReset
							>
								<Icon name="lock-closed">
									{isAdmin ? 'Demote from Admin' : 'Promote to Admin'}
								</Icon>
							</Link>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			)
		},
	},
]
