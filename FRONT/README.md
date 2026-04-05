# Clínicas - Frontend

Sistema de gerenciamento de clínicas Next.js 14+ integrado com a API White Label de Clínicas em Go.

## 🚀 Tecnologias

- **Next.js 14+** - App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **Zustand** - State management
- **React Query** - Data fetching & caching
- **Sonner** - Toast notifications
- **Lucide React** - Icons
- **shadcn/ui** - UI components

## 📁 Arquitetura

```
src/
├── app/               # Routes & layouts
│   ├── (auth)/        # Auth group (login, forgot password)
│   ├── (dashboard)/   # Protected dashboard routes
│   ├── layout.tsx     # Root layout
│   ├── page.tsx       # Root redirect
│   └── globals.css    # Global styles
├── components/
│   └── ui/            # shadcn/ui components (Button, Input, Card, etc)
├── hooks/
│   └── use-auth.ts    # Authentication hook
├── services/
│   └── api-client.ts  # Centralized Axios client
├── store/
│   └── auth-store.ts  # Zustand auth store
├── types/
│   └── api.ts         # TypeScript interfaces from Swagger
└── lib/
    └── utils/
        └── cn.ts      # Tailwind CSS utility
```

## 🔧 Setup

### 1. Instalar dependências

```bash
npm install
# ou
yarn install
```

### 2. Configurar variáveis de ambiente

Criar `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
NODE_ENV=development
```

### 3. Rodar em desenvolvimento

```bash
npm run dev
# ou
yarn dev
```

Abrir [http://localhost:3000](http://localhost:3000)

## 🏗️ Funcionalidades Implementadas

### ✅ MVP Base
- [x] Estrutura Next.js 14 com App Router
- [x] Autenticação com JWT
- [x] Login funcional integrado ao Swagger
- [x] Store de autenticação (Zustand)
- [x] Serviço API centralizado (Axios)
- [x] Tipos TypeScript completos
- [x] Middleware de proteção de rotas
- [x] Provider de React Query + Toaster
- [x] Componentes shadcn/ui básicos
- [x] UI responsiva (Desktop/Tablet)

### 🚧 Em Progresso
- [ ] Dashboard dinâmico com dados do /dashboard
- [ ] Calendário de agendamentos
- [ ] Sistema de prontuários com validação 24h
- [ ] RBAC completo (ocultar menus Financeiro para Médicos)
- [ ] Gerenciamento de clínicas (switch de contexto)
- [ ] Tratamento de erros API (401, 403, 404, 409, 500)

## 🔐 Autenticação

O sistema utiliza **JWT Bearer Token** com persistência em cookies:

1. Login em `/login`
2. Token salvo em `auth_token` cookie
3. Middleware redireciona rotas protegidas
4. Interceptador Axios adiciona token automaticamente
5. 401 auto-logout com redirecionamento

## 🎨 Design

- **Cores**: Azul clínico (#0ea5e9), branco, cinza claro
- **Responsividade**: Mobile-first, otimizado para Desktop/Tablet
- **Acessibilidade**: Focus visible, contraste adequado

## 📝 RBAC (Role-Based Access Control)

Papéis suportados:
- `ADM_GERAL` - Acesso total
- `DONO` - Acesso administrativo da clínica
- `MEDICO` - Acesso médico
- `SECRETARIA` - Acesso operacional

Use `useAuth().hasPermission(['MEDICO'])` para esconder/mostrar elementos.

## 🛠️ Build & Deploy

```bash
# Build
npm run build

# Production
npm run start

# Lint
npm run lint
```

## 📞 Integração com API

A API está documentada via Swagger em `@swagger.json`. Todos os endpoints estão mapeados em `src/services/api-client.ts`.

### Exemplo de uso:

```typescript
import { useAuth } from '@/hooks/use-auth'
import { apiClient } from '@/services/api-client'

export default function MyPage() {
  const { usuario } = useAuth()

  const handleGetAgendas = async () => {
    const agendas = await apiClient.getAgendas()
  }

  return <div>Olá {usuario?.nome}</div>
}
```

## 📚 Documentação

- [Next.js Docs](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [Zustand](https://github.com/pmndrs/zustand)
- [React Query](https://tanstack.com/query/latest)
