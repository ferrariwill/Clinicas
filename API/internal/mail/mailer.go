package mail

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/ferrariwill/Clinicas/API/internal/logger"
	"github.com/ferrariwill/Clinicas/API/utils"
)

// Mailer despacha e-mail transacional: se RESEND_API_KEY estiver definido, usa HTTPS (Resend);
// caso contrário usa SMTP (SMTPFromEnv). Render e outros hosts costumam bloquear saída SMTP.
type Mailer struct {
	resendAPIKey string
	resendFrom   string
	smtp         *Sender
}

// MailerFromEnv monta o despachante. Retorna nil se não houver nem Resend nem SMTP configurado.
func MailerFromEnv() *Mailer {
	rk := strings.TrimSpace(os.Getenv("RESEND_API_KEY"))
	rf := strings.TrimSpace(os.Getenv("RESEND_FROM"))
	if rf == "" {
		rf = strings.TrimSpace(os.Getenv("SMTP_FROM"))
	}
	smtp := SMTPFromEnv()
	if rk == "" && smtp == nil {
		return nil
	}
	return &Mailer{resendAPIKey: rk, resendFrom: rf, smtp: smtp}
}

// Send entrega a mensagem (Resend com prioridade se a chave existir).
func (m *Mailer) Send(to, subject, body string) error {
	if m == nil {
		return errors.New("mailer não configurado")
	}
	to = utils.NormalizarEmail(strings.TrimSpace(to))
	if to == "" {
		return errors.New("destinatário vazio")
	}
	if m.resendAPIKey != "" {
		if strings.TrimSpace(m.resendFrom) == "" {
			return fmt.Errorf("defina RESEND_FROM ou SMTP_FROM para envio via Resend")
		}
		return m.sendResend(to, subject, strings.TrimSpace(body))
	}
	if m.smtp != nil {
		return m.smtp.Send(to, subject, body)
	}
	return errors.New("e-mail não configurado: defina RESEND_API_KEY ou SMTP_HOST")
}

type resendCreateEmailRequest struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	Text    string   `json:"text"`
}

type resendErrorBody struct {
	Message string `json:"message"`
}

func (m *Mailer) sendResend(to, subject, body string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()

	payload := resendCreateEmailRequest{
		From:    m.resendFrom,
		To:      []string{to},
		Subject: subject,
		Text:    body,
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	logger.L.Info("resend_send",
		slog.String("event", "request"),
		slog.String("to_domain", logger.EmailDomain(to)),
	)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.resend.com/emails", bytes.NewReader(raw))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+m.resendAPIKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		logger.L.Error("resend_send",
			slog.String("event", "http_failed"),
			slog.String("to_domain", logger.EmailDomain(to)),
			slog.Any("error", err),
		)
		return fmt.Errorf("resend http: %w", err)
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		var rb resendErrorBody
		_ = json.Unmarshal(respBody, &rb)
		msg := strings.TrimSpace(rb.Message)
		if msg == "" {
			msg = strings.TrimSpace(string(respBody))
		}
		logger.L.Error("resend_send",
			slog.String("event", "api_error"),
			slog.Int("status", resp.StatusCode),
			slog.String("to_domain", logger.EmailDomain(to)),
			slog.String("detail", msg),
		)
		return fmt.Errorf("resend api %d: %s", resp.StatusCode, msg)
	}

	var ok struct {
		ID string `json:"id"`
	}
	_ = json.Unmarshal(respBody, &ok)
	logger.L.Info("resend_send",
		slog.String("event", "ok"),
		slog.String("to_domain", logger.EmailDomain(to)),
		slog.String("resend_id", ok.ID),
	)
	return nil
}
