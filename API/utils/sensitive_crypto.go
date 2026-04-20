package utils

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"os"
	"strings"
)

const encryptedPrefix = "enc::"

func getSensitiveDataKey() ([]byte, error) {
	raw := strings.TrimSpace(os.Getenv("SENSITIVE_DATA_KEY"))
	if raw == "" {
		return nil, errors.New("chave de criptografia não configurada")
	}
	key, err := base64.StdEncoding.DecodeString(raw)
	if err != nil {
		return nil, errors.New("chave de criptografia inválida")
	}
	if len(key) != 32 {
		return nil, errors.New("chave de criptografia deve ter 32 bytes (AES-256)")
	}
	return key, nil
}

// EncryptSensitiveField cifra texto com AES-256-GCM.
func EncryptSensitiveField(plain string) (string, error) {
	p := strings.TrimSpace(plain)
	if p == "" {
		return "", nil
	}
	key, err := getSensitiveDataKey()
	if err != nil {
		return "", err
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", errors.New("erro ao preparar criptografia")
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", errors.New("erro ao preparar criptografia")
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", errors.New("erro ao gerar nonce")
	}
	cipherText := gcm.Seal(nil, nonce, []byte(p), nil)
	payload := append(nonce, cipherText...)
	return encryptedPrefix + base64.StdEncoding.EncodeToString(payload), nil
}

// DecryptSensitiveField descriptografa AES-256-GCM. Valores legados (sem prefixo) retornam inalterados.
func DecryptSensitiveField(in string) (string, error) {
	if strings.TrimSpace(in) == "" {
		return "", nil
	}
	if !strings.HasPrefix(in, encryptedPrefix) {
		return in, nil
	}
	enc := strings.TrimPrefix(in, encryptedPrefix)
	raw, err := base64.StdEncoding.DecodeString(enc)
	if err != nil {
		return "", fmt.Errorf("payload criptografado inválido")
	}
	key, err := getSensitiveDataKey()
	if err != nil {
		return "", err
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", errors.New("erro ao preparar descriptografia")
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", errors.New("erro ao preparar descriptografia")
	}
	ns := gcm.NonceSize()
	if len(raw) < ns {
		return "", errors.New("payload criptografado truncado")
	}
	nonce := raw[:ns]
	cipherText := raw[ns:]
	plain, err := gcm.Open(nil, nonce, cipherText, nil)
	if err != nil {
		return "", errors.New("falha ao descriptografar dado sensível")
	}
	return string(plain), nil
}
