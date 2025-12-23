# API Clínicas

API para gestão de clínicas, procedimentos e agendamentos desenvolvida em Go com Gin Framework.

## 🚀 Como executar

### Pré-requisitos
- Go 1.24.6 ou superior
- PostgreSQL
- Arquivo `.env` configurado

### Instalação
```bash
# Clonar o repositório
git clone <url-do-repositorio>
cd Clinicas

# Instalar dependências
go mod tidy

# Executar o projeto
go run cmd/main.go
```

## 📚 Documentação da API (Swagger)

A documentação da API está disponível através do Swagger UI.

### Acessar o Swagger
Após iniciar o servidor, acesse:
```
http://localhost:8080/swagger/index.html
```

### Regenerar documentação Swagger
```bash
# Instalar swag (primeira vez)
go install github.com/swaggo/swag/cmd/swag@latest

# Gerar documentação
swag init -g cmd/main.go

# Ou usar o Makefile
make swagger
```

### Como adicionar documentação aos endpoints

Para documentar um novo endpoint, adicione anotações Swagger acima da função do controller:

```go
// @Summary Descrição breve do endpoint
// @Description Descrição detalhada do endpoint
// @Tags Nome da Tag
// @Accept json
// @Produce json
// @Param parametro body TipoDoParametro true "Descrição do parâmetro"
// @Success 200 {object} TipoDeResposta
// @Failure 400 {object} map[string]string
// @Security BearerAuth
// @Router /endpoint [post]
func MeuController() gin.HandlerFunc {
    // implementação
}
```

### Estrutura de anotações Swagger

- `@Summary`: Resumo do endpoint
- `@Description`: Descrição detalhada
- `@Tags`: Agrupa endpoints por categoria
- `@Accept`: Tipo de conteúdo aceito (json, xml, etc.)
- `@Produce`: Tipo de conteúdo retornado
- `@Param`: Parâmetros do endpoint
- `@Success`: Resposta de sucesso
- `@Failure`: Respostas de erro
- `@Security`: Tipo de autenticação necessária
- `@Router`: Rota e método HTTP

### Exemplo de estruturas para documentação

```go
// LoginRequest representa os dados de login
type LoginRequest struct {
    Email string `json:"email" binding:"required,email" example:"usuario@exemplo.com"`
    Senha string `json:"senha" binding:"required" example:"123456"`
}

// LoginResponse representa a resposta do login
type LoginResponse struct {
    Token   string      `json:"token" example:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."`
    Usuario UsuarioInfo `json:"usuario"`
}
```

## 🔧 Comandos úteis

```bash
# Executar o projeto
make run

# Gerar documentação Swagger
make swagger

# Compilar o projeto
make build

# Executar testes
make test

# Limpar arquivos gerados
make clean
```

## 🔐 Autenticação

A API utiliza JWT (JSON Web Tokens) para autenticação. Para acessar endpoints protegidos:

1. Faça login através do endpoint `/login`
2. Use o token retornado no header `Authorization: Bearer <token>`
3. No Swagger UI, clique em "Authorize" e insira `Bearer <seu-token>`

## 📁 Estrutura do projeto

```
Clinicas/
├── cmd/                    # Ponto de entrada da aplicação
├── controllers/            # Controladores da API
├── models/                 # Modelos de dados
├── services/              # Lógica de negócio
├── repositories/          # Camada de dados
├── middleware/            # Middlewares
├── routes/                # Definição de rotas
├── docs/                  # Documentação Swagger gerada
├── config/                # Configurações
├── database/              # Conexão e migrações
└── utils/                 # Utilitários
```

## 🌐 Endpoints principais

- `POST /login` - Autenticação de usuário
- `GET /swagger/index.html` - Documentação da API
- `GET /usuarios` - Listar usuários
- `GET /clinicas` - Listar clínicas
- `GET /pacientes` - Listar pacientes
- `GET /procedimentos` - Listar procedimentos
- `GET /convenios` - Listar convênios

Para ver todos os endpoints disponíveis, acesse a documentação Swagger.