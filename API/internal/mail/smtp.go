// Package mail envia e-mails transacionais (ex.: recuperação de senha, convites de equipe).
//
// Lark Mail: use SMTP do console (ex.: smtp.larksuite.com). Porta 465 usa TLS implícito;
// porta 587 usa STARTTLS (net/smtp padrão).
package mail

import (
	"crypto/tls"
	"errors"
	"fmt"
	"io"
	"net/smtp"
	"os"
	"strconv"
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

	port, err := strconv.Atoi(strings.TrimSpace(s.Port))
	if err != nil {
		return fmt.Errorf("SMTP_PORT inválido: %w", err)
	}

	header := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n",
		s.From, to, subject)
	msg := []byte(header + body)

	if port == 465 {
		return s.sendImplicitTLS(to, msg)
	}

	addr := s.Host + ":" + s.Port
	var auth smtp.Auth
	if s.User != "" {
		auth = smtp.PlainAuth("", s.User, s.Password, s.Host)
	}
	return smtp.SendMail(addr, auth, s.From, []string{to}, msg)
}

func (s *Sender) sendImplicitTLS(to string, msg []byte) (err error) {
	addr := s.Host + ":" + s.Port
	tlsCfg := &tls.Config{ServerName: s.Host}
	conn, err := tls.Dial("tcp", addr, tlsCfg)
	if err != nil {
		return fmt.Errorf("TLS SMTP (%s): %w", addr, err)
	}

	client, err := smtp.NewClient(conn, s.Host)
	if err != nil {
		_ = conn.Close()
		return err
	}
	defer func() {
		if err != nil {
			_ = client.Close()
		}
	}()

	if ok, _ := client.Extension("AUTH"); ok && s.User != "" {
		auth := smtp.PlainAuth("", s.User, s.Password, s.Host)
		if err = client.Auth(auth); err != nil {
			return err
		}
	}

	if err = client.Mail(s.From); err != nil {
		return err
	}
	if err = client.Rcpt(to); err != nil {
		return err
	}
	var wc io.WriteCloser
	wc, err = client.Data()
	if err != nil {
		return err
	}
	if _, err = wc.Write(msg); err != nil {
		_ = wc.Close()
		return err
	}
	if err = wc.Close(); err != nil {
		return err
	}
	err = client.Quit()
	return err
}
