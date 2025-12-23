.PHONY: swagger run build clean

# Gerar documentação Swagger
swagger:
	swag init -g cmd/main.go

# Executar o projeto
run:
	go run cmd/main.go

# Compilar o projeto
build:
	go build -o bin/clinicas cmd/main.go

# Limpar arquivos gerados
clean:
	rm -rf bin/
	rm -f docs/docs.go docs/swagger.json docs/swagger.yaml

# Instalar dependências
deps:
	go mod tidy
	go mod download

# Executar testes
test:
	go test ./...

# Executar com hot reload (requer air: go install github.com/cosmtrek/air@latest)
dev:
	air