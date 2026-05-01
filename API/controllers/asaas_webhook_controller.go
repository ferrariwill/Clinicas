package controllers

import (
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/ferrariwill/Clinicas/API/services"
	"github.com/gin-gonic/gin"
)

type AsaasWebhookController struct {
	svc services.CobrancaService
}

func NovoAsaasWebhookController(svc services.CobrancaService) *AsaasWebhookController {
	return &AsaasWebhookController{svc: svc}
}

func (w *AsaasWebhookController) Receber(c *gin.Context) {
	expected := strings.TrimSpace(os.Getenv("ASAAS_WEBHOOK_TOKEN"))
	if expected == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{"erro": "webhook não configurado"})
		return
	}
	if c.Query("token") != expected {
		c.JSON(http.StatusUnauthorized, gin.H{"erro": "token inválido"})
		return
	}
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "corpo inválido"})
		return
	}
	if err := w.svc.ProcessarWebhookAsaas(body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
