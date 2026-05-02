// Package mail envia e-mails transacionais (ex.: recuperação de senha, convites de equipe).
//
// Lark Mail: use SMTP do console (ex.: smtp.larksuite.com). Porta 465 usa TLS implícito;
// porta 587 usa STARTTLS (net/smtp padrão).
package mail

import (
	"crypto/tls"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/mail"
	"net/smtp"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/ferrariwill/Clinicas/API/internal/logger"
	"github.com/ferrariwill/Clinicas/API/utils"
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

func smtpDialTimeout() time.Duration {
	if v := strings.TrimSpace(os.Getenv("SMTP_DIAL_TIMEOUT_SEC")); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			return time.Duration(n) * time.Second
		}
	}
	return 30 * time.Second
}

func smtpSessionTimeout() time.Duration {
	if v := strings.TrimSpace(os.Getenv("SMTP_SESSION_TIMEOUT_SEC")); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			return time.Duration(n) * time.Second
		}
	}
	return 90 * time.Second
}

// addressForSMTPEnvelope extrai só o endereço para MAIL FROM (ex.: "Nome" <a@b> → a@b).
func addressForSMTPEnvelope(from string) string {
	from = strings.TrimSpace(from)
	if from == "" {
		return from
	}
	a, err := mail.ParseAddress(from)
	if err == nil && a != nil && strings.TrimSpace(a.Address) != "" {
		return utils.NormalizarEmail(a.Address)
	}
	return utils.NormalizarEmail(from)
}

// subjectForMIMEHeader codifica assunto não-ASCII (RFC 2047) — evita falha em servidores rígidos (ex.: Lark).
func subjectForMIMEHeader(subject string) string {
	needs := false
	for _, r := range subject {
		if r > 127 || r == '\n' || r == '\r' {
			needs = true
			break
		}
	}
	if !needs {
		return subject
	}
	return "=?UTF-8?B?" + base64.StdEncoding.EncodeToString([]byte(subject)) + "?="
}

// Send envia uma mensagem UTF-8 (assunto e corpo em texto).
func (s *Sender) Send(to, subject, body string) error {
	if s == nil {
		return ErrSMTPNotConfigured
	}
	if s.From == "" {
		return fmt.Errorf("%w: SMTP_FROM obrigatório", ErrSMTPNotConfigured)
	}
	to = utils.NormalizarEmail(to)
	if to == "" {
		return errors.New("destinatário vazio")
	}

	port, err := strconv.Atoi(strings.TrimSpace(s.Port))
	if err != nil {
		return fmt.Errorf("SMTP_PORT inválido: %w", err)
	}

	subjHdr := subjectForMIMEHeader(subject)
	header := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n",
		s.From, to, subjHdr)
	msg := []byte(header + body)

	toDomain := logger.EmailDomain(to)
	authMode := "none"
	if strings.TrimSpace(s.User) != "" {
		authMode = "plain"
	}

	if port == 465 {
		logger.L.Info("smtp_send",
			slog.String("event", "implicit_tls_start"),
			slog.String("to_domain", toDomain),
			slog.String("smtp_host", s.Host),
			slog.String("smtp_port", s.Port),
			slog.String("auth", authMode),
			slog.Int64("dial_timeout_ms", smtpDialTimeout().Milliseconds()),
			slog.Int64("session_timeout_ms", smtpSessionTimeout().Milliseconds()),
		)
		err := s.sendImplicitTLS(to, msg, toDomain)
		if err != nil {
			logger.L.Error("smtp_send",
				slog.String("event", "implicit_tls_failed"),
				slog.String("to_domain", toDomain),
				slog.String("smtp_host", s.Host),
				slog.Any("error", err),
			)
			return err
		}
		logger.L.Info("smtp_send",
			slog.String("event", "implicit_tls_ok"),
			slog.String("to_domain", toDomain),
			slog.String("smtp_host", s.Host),
		)
		return nil
	}

	addr := s.Host + ":" + s.Port
	var auth smtp.Auth
	if s.User != "" {
		auth = smtp.PlainAuth("", s.User, s.Password, s.Host)
	}
	logger.L.Info("smtp_send",
		slog.String("event", "starttls_or_plain_start"),
		slog.String("to_domain", toDomain),
		slog.String("smtp_addr", addr),
		slog.String("auth", authMode),
	)
	err = smtp.SendMail(addr, auth, s.From, []string{to}, msg)
	if err != nil {
		logger.L.Error("smtp_send",
			slog.String("event", "send_failed"),
			slog.String("to_domain", toDomain),
			slog.String("smtp_addr", addr),
			slog.Any("error", err),
		)
		return err
	}
	logger.L.Info("smtp_send",
		slog.String("event", "send_ok"),
		slog.String("to_domain", toDomain),
		slog.String("smtp_addr", addr),
	)
	return nil
}

func (s *Sender) sendImplicitTLS(to string, msg []byte, toDomain string) (err error) {
	addr := s.Host + ":" + s.Port
	deadline := time.Now().Add(smtpSessionTimeout())

	dialer := &net.Dialer{Timeout: smtpDialTimeout()}
	rawConn, err := dialer.Dial("tcp", addr)
	if err != nil {
		return fmt.Errorf("tcp dial %s: %w", addr, err)
	}
	logger.L.Info("smtp_send",
		slog.String("event", "implicit_tls_tcp_ok"),
		slog.String("smtp_addr", addr),
		slog.String("to_domain", toDomain),
	)

	var tlsConn *tls.Conn
	tlsCfg := &tls.Config{ServerName: s.Host}
	tlsConn = tls.Client(rawConn, tlsCfg)
	_ = tlsConn.SetDeadline(deadline)
	if err = tlsConn.Handshake(); err != nil {
		_ = rawConn.Close()
		return fmt.Errorf("TLS handshake %s: %w", addr, err)
	}
	logger.L.Info("smtp_send",
		slog.String("event", "implicit_tls_handshake_ok"),
		slog.String("smtp_host", s.Host),
		slog.String("to_domain", toDomain),
	)

	client, err := smtp.NewClient(tlsConn, s.Host)
	if err != nil {
		_ = tlsConn.Close()
		return fmt.Errorf("smtp client: %w", err)
	}
	defer func() {
		if err != nil {
			_ = client.Close()
		}
	}()
	logger.L.Info("smtp_send",
		slog.String("event", "implicit_tls_smtp_client_ok"),
		slog.String("to_domain", toDomain),
	)

	if ok, _ := client.Extension("AUTH"); ok && s.User != "" {
		auth := smtp.PlainAuth("", s.User, s.Password, s.Host)
		if err = client.Auth(auth); err != nil {
			return fmt.Errorf("smtp AUTH: %w", err)
		}
		logger.L.Info("smtp_send",
			slog.String("event", "implicit_tls_auth_ok"),
			slog.String("to_domain", toDomain),
		)
	} else if s.User != "" {
		logger.L.Warn("smtp_send",
			slog.String("event", "implicit_tls_auth_missing_extension"),
			slog.String("to_domain", toDomain),
			slog.String("hint", "servidor não anunciou AUTH; envio pode falhar em seguida"),
		)
	}

	fromEnv := addressForSMTPEnvelope(s.From)
	if fromEnv == "" {
		return errors.New("SMTP_FROM sem endereço válido para MAIL FROM")
	}
	if err = client.Mail(fromEnv); err != nil {
		return fmt.Errorf("MAIL FROM <%s>: %w", fromEnv, err)
	}
	logger.L.Info("smtp_send",
		slog.String("event", "implicit_tls_mail_from_ok"),
		slog.String("to_domain", toDomain),
		slog.String("mail_from_domain", logger.EmailDomain(fromEnv)),
	)

	if err = client.Rcpt(to); err != nil {
		return fmt.Errorf("RCPT TO <%s>: %w", to, err)
	}
	logger.L.Info("smtp_send",
		slog.String("event", "implicit_tls_rcpt_ok"),
		slog.String("to_domain", toDomain),
	)

	var wc io.WriteCloser
	wc, err = client.Data()
	if err != nil {
		return fmt.Errorf("DATA: %w", err)
	}
	if _, err = wc.Write(msg); err != nil {
		_ = wc.Close()
		return fmt.Errorf("DATA write: %w", err)
	}
	if err = wc.Close(); err != nil {
		return fmt.Errorf("DATA close: %w", err)
	}
	logger.L.Info("smtp_send",
		slog.String("event", "implicit_tls_data_ok"),
		slog.String("to_domain", toDomain),
	)

	if err = client.Quit(); err != nil {
		return fmt.Errorf("QUIT: %w", err)
	}
	logger.L.Info("smtp_send",
		slog.String("event", "implicit_tls_quit_ok"),
		slog.String("to_domain", toDomain),
	)
	return nil
}
