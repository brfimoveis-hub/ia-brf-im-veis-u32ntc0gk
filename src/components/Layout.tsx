import { Outlet, Link, useLocation } from 'react-router-dom'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarHeader,
} from '@/components/ui/sidebar'
import {
  LayoutDashboard,
  MessageSquare,
  Settings as SettingsIcon,
  Activity,
  Bot,
  Kanban,
  BookOpen,
  Users,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const menuItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'CRM Pipeline', url: '/crm', icon: Kanban },
  { title: 'Base de Clientes', url: '/clientes', icon: Users },
  { title: 'Conversas', url: '/conversas', icon: MessageSquare },
  { title: 'Base de Conhecimento', url: '/conhecimento', icon: BookOpen },
  { title: 'Configurações', url: '/configuracoes', icon: SettingsIcon },
  { title: 'Logs', url: '#', icon: Activity },
]

export default function Layout() {
  const location = useLocation()

  return (
    <SidebarProvider>
      <Sidebar variant="sidebar">
        <SidebarHeader className="h-16 flex items-center justify-center sm:justify-start border-b border-sidebar-border px-4">
          <div className="flex items-center gap-2 font-bold text-lg text-sidebar-foreground">
            <div className="bg-primary/20 p-1.5 rounded-lg">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <span>Uazapi AI</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === item.url}
                      tooltip={item.title}
                    >
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <div className="flex flex-1 flex-col min-h-screen overflow-hidden bg-background">
        <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-4 shadow-sm md:px-6 z-10">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="-ml-2 text-secondary" />
            <h1 className="text-lg font-semibold text-secondary hidden sm:block">
              {menuItems.find((item) => item.url === location.pathname)?.title || 'Uazapi AI'}
            </h1>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-1.5 sm:gap-2 rounded-full border bg-background px-2 py-1 sm:px-3 sm:py-1.5 shadow-sm">
              <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-primary"></span>
              </span>
              <span className="text-xs sm:text-sm font-semibold tracking-tight text-secondary">
                55 48 992098050
              </span>
            </div>
            <Avatar className="h-8 w-8 cursor-pointer ring-2 ring-transparent hover:ring-primary transition-all shadow-sm">
              <AvatarImage
                src="https://img.usecurling.com/ppl/thumbnail?gender=female&seed=2"
                alt="User"
              />
              <AvatarFallback>UA</AvatarFallback>
            </Avatar>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 animate-fade-in flex flex-col relative">
          <div className="flex-1 relative min-h-0">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}
