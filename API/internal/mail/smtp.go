package mail

import (
	"errors"
	"fmt"
	"net/smtp"
	"os"
	"strings"
)

// ErrSMTPNotConfigured indica variáveis SMTP ausentes.
var ErrSMTPNotConfigured = errors.New("SMTP não configurado (defina SMTP_HOST, SMTP_PORT, SMTP_FROM)")

// Sender envia e-mail em texto simples.
type Sender struct {
	Host, Port, User, Password, From string
}

// FromEnv monta o sender a partir do ambiente. Retorna nil se SMTP_HOST estiver vazio.
func FromEnv() *Sender {
	host := strings.TrimSpace(os.Getenv("SMTP_HOST"))
	if host == "" {
		return nil
	}
	port := strings.TrimSpace(os.Getenv("SMTP_PORT"))
	if port == "" {
		port = "587"
	}
	return &Sender{
		Host:     host,
		Port:     port,
		User:     strings.TrimSpace(os.Getenv("SMTP_USER")),
		Password: strings.TrimSpace(os.Getenv("SMTP_PASS")),
		From:     strings.TrimSpace(os.Getenv("SMTP_FROM")),
	}
}

// Send envia uma mensagem UTF-8 (assunto e corpo em texto).
func (s *Sender) Send(to, subject, body string) error {
	if s == nil {
		return ErrSMTPNotConfigured
	}
	if s.From == "" {
		return fmt.Errorf("%w: SMTP_FROM obrigatório", ErrSMTPNotConfigured)
	}
	to = strings.TrimSpace(to)
	if to == "" {
		return errors.New("destinatário vazio")
	}
	addr := s.Host + ":" + s.Port
	header := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n",
		s.From, to, subject)
	msg := []byte(header + body)

	var auth smtp.Auth
	if s.User != "" {
		auth = smtp.PlainAuth("", s.User, s.Password, s.Host)
	}
	return smtp.SendMail(addr, auth, s.From, []string{to}, msg)
}
