package utils

import (
	"crypto/rand"
	"math/big"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

const senhaAleatoriaChars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"

// SenhaAleatoria gera senha provisória segura (evita caracteres ambíguos 0/O, 1/l).
func SenhaAleatoria(n int) string {
	if n < 12 {
		n = 12
	}
	max := big.NewInt(int64(len(senhaAleatoriaChars)))
	out := make([]byte, n)
	for i := range out {
		v, err := rand.Int(rand.Reader, max)
		if err != nil {
			out[i] = 'X'
			continue
		}
		out[i] = senhaAleatoriaChars[v.Int64()]
	}
	return string(out)
}

func HashSenha(senha string) (string, error) {

	bytes, err := bcrypt.GenerateFromPassword([]byte(senha), 14)
	return string(bytes), err
}

func VerificarSenha(senha, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(senha))
	return err == nil
}

func GerarUUID() string {
	return uuid.New().String()
}
