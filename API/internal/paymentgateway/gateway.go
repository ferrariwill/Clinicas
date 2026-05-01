// Package paymentgateway abstrai o provedor de pagamento (Asaas, etc.).
package paymentgateway

import "context"

type MetodoCobranca string

const (
	MetodoPix        MetodoCobranca = "PIX"
	MetodoCreditCard MetodoCobranca = "CREDIT_CARD"
)

// CobrancaCliente dados mínimos para cadastro de cliente no gateway.
type CobrancaCliente struct {
	Nome     string
	CPFCNPJ  string
	Email    string
	Telefone string
}

// CriarCobrancaInput parâmetros para criar cobrança avulsa.
type CriarCobrancaInput struct {
	ValorBruto       float64
	DueDate          string // YYYY-MM-DD
	Description      string
	ExternalRef      string
	CustomerID       string // id já existente no gateway
	BillingType      string // PIX | CREDIT_CARD
	SplitWalletID    string
	SplitPercentual  float64 // 0–100 sobre valor líquido (conforme Asaas)
}

// CriarCobrancaResult retorno normalizado para persistência e API.
type CriarCobrancaResult struct {
	GatewayName     string
	PaymentID       string
	InvoiceURL      string
	PixCopiaECola   string
	PixQRCodeBase64 string
	RawStatus       string
}

// Gateway contrato para trocar implementação sem alterar o domínio de cobrança.
type Gateway interface {
	Name() string
	CriarCliente(ctx context.Context, c CobrancaCliente) (customerID string, err error)
	CriarCobranca(ctx context.Context, in CriarCobrancaInput) (*CriarCobrancaResult, error)
	BuscarCobranca(ctx context.Context, paymentID string) (status string, value, netValue float64, err error)
}
