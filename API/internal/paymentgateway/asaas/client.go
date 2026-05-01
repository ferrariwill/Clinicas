package asaas

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/ferrariwill/Clinicas/API/internal/paymentgateway"
)

// Client integração REST Asaas v3 (header access_token).
type Client struct {
	BaseURL string
	APIKey  string
	HTTP    *http.Client
}

func NewFromEnv() *Client {
	base := strings.TrimSpace(os.Getenv("ASAAS_BASE_URL"))
	if base == "" {
		base = "https://api-sandbox.asaas.com"
	}
	base = strings.TrimRight(base, "/")
	return &Client{
		BaseURL: base,
		APIKey:  strings.TrimSpace(os.Getenv("ASAAS_API_KEY")),
		HTTP:    &http.Client{Timeout: 45 * time.Second},
	}
}

func (c *Client) Name() string { return "asaas" }

func (c *Client) enabled() bool { return c.APIKey != "" }

func (c *Client) do(ctx context.Context, method, path string, body any, out any) error {
	if !c.enabled() {
		return fmt.Errorf("ASAAS_API_KEY não configurada")
	}
	var buf io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return err
		}
		buf = bytes.NewReader(b)
	}
	req, err := http.NewRequestWithContext(ctx, method, c.BaseURL+path, buf)
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("access_token", c.APIKey)
	resp, err := c.HTTP.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return fmt.Errorf("asaas %s %s: %s", method, path, string(raw))
	}
	if out != nil && len(raw) > 0 && string(raw) != "null" {
		return json.Unmarshal(raw, out)
	}
	return nil
}

type customerReq struct {
	Name     string `json:"name"`
	Email    string `json:"email,omitempty"`
	CpfCnpj  string `json:"cpfCnpj,omitempty"`
	Phone    string `json:"phone,omitempty"`
	External string `json:"externalReference,omitempty"`
}

type customerResp struct {
	ID string `json:"id"`
}

func digitsOnly(s string) string {
	b := make([]rune, 0, len(s))
	for _, r := range s {
		if r >= '0' && r <= '9' {
			b = append(b, r)
		}
	}
	return string(b)
}

func (c *Client) CriarCliente(ctx context.Context, cl paymentgateway.CobrancaCliente) (string, error) {
	body := customerReq{
		Name:     cl.Nome,
		Email:    cl.Email,
		CpfCnpj:  digitsOnly(cl.CPFCNPJ),
		Phone:    digitsOnly(cl.Telefone),
		External: "clinicas_paciente",
	}
	var out customerResp
	if err := c.do(ctx, http.MethodPost, "/v3/customers", body, &out); err != nil {
		return "", err
	}
	return out.ID, nil
}

type splitItem struct {
	WalletID         string  `json:"walletId"`
	PercentualValue  float64 `json:"percentualValue,omitempty"`
	Description      string  `json:"description,omitempty"`
	ExternalReference string `json:"externalReference,omitempty"`
}

type paymentReq struct {
	Customer          string      `json:"customer"`
	BillingType       string      `json:"billingType"`
	Value             float64     `json:"value"`
	DueDate           string      `json:"dueDate"`
	Description       string      `json:"description,omitempty"`
	ExternalReference string      `json:"externalReference,omitempty"`
	Split             []splitItem `json:"split,omitempty"`
}

type paymentResp struct {
	ID          string  `json:"id"`
	Status      string  `json:"status"`
	InvoiceURL  string  `json:"invoiceUrl"`
	Value       float64 `json:"value"`
	NetValue    float64 `json:"netValue"`
	BillingType string  `json:"billingType"`
}

type pixQrResp struct {
	EncodedImage string `json:"encodedImage"`
	Payload      string `json:"payload"`
}

func (c *Client) CriarCobranca(ctx context.Context, in paymentgateway.CriarCobrancaInput) (*paymentgateway.CriarCobrancaResult, error) {
	if in.CustomerID == "" {
		return nil, fmt.Errorf("customerId obrigatório")
	}
	req := paymentReq{
		Customer:          in.CustomerID,
		BillingType:       in.BillingType,
		Value:             in.ValorBruto,
		DueDate:           in.DueDate,
		Description:       in.Description,
		ExternalReference: in.ExternalRef,
	}
	if in.SplitWalletID != "" && in.SplitPercentual > 0 {
		req.Split = []splitItem{{
			WalletID:          in.SplitWalletID,
			PercentualValue:   in.SplitPercentual,
			Description:       "Taxa plataforma",
			ExternalReference: "split_sistema",
		}}
	}
	var pay paymentResp
	if err := c.do(ctx, http.MethodPost, "/v3/payments", req, &pay); err != nil {
		return nil, err
	}
	res := &paymentgateway.CriarCobrancaResult{
		GatewayName: c.Name(),
		PaymentID:   pay.ID,
		InvoiceURL:  pay.InvoiceURL,
		RawStatus:   pay.Status,
	}
	if strings.EqualFold(in.BillingType, "PIX") && pay.ID != "" {
		var pix pixQrResp
		if err := c.do(ctx, http.MethodGet, "/v3/payments/"+pay.ID+"/pixQrCode", nil, &pix); err == nil {
			res.PixCopiaECola = pix.Payload
			res.PixQRCodeBase64 = pix.EncodedImage
		}
	}
	return res, nil
}

func (c *Client) BuscarCobranca(ctx context.Context, paymentID string) (status string, value, netValue float64, err error) {
	var pay paymentResp
	if err = c.do(ctx, http.MethodGet, "/v3/payments/"+paymentID, nil, &pay); err != nil {
		return "", 0, 0, err
	}
	return pay.Status, pay.Value, pay.NetValue, nil
}
