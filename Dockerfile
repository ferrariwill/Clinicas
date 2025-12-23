# Etapa 1: build da aplicação
FROM golang:1.24 AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o main ./cmd/main.go

# Etapa 2: imagem final leve
FROM debian:bullseye-slim

WORKDIR /app

COPY --from=builder /app/main .
COPY .env .env

EXPOSE 8080

CMD ["./main"]