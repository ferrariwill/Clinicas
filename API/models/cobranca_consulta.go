package models

import (
	"time"

	"gorm.io/gorm"
)

const (
	CobrancaStatusAguardando = "AGUARDANDO_PAGAMENTO"
	CobrancaStatusPago       = "PAGO"
	CobrancaStatusRecusado   = "RECUSADO"
)

const (
	CobrancaMetodoPix          = "PIX"
	CobrancaMetodoCreditCard   = "CREDIT_CARD"
	CobrancaMetodoDinheiro     = "DINHEIRO"
	CobrancaMetodoManual       = "MANUAL"
)

// CobrancaConsulta registra cobrança de consulta (gateway + taxas para transparência).
type CobrancaConsulta struct {
	gorm.Model
	ClinicaID               uint    `json:"clinica_id" gorm:"index;not null"`
	AgendaID                uint    `json:"agenda_id" gorm:"index;not null"`
	Agenda                  Agenda  `json:"agenda,omitempty" gorm:"foreignKey:AgendaID"`
	ValorBruto              float64 `json:"valor_bruto"`
	PercentualSplitSnapshot float64 `json:"percentual_split_snapshot"`
	TaxaSistemaValor        float64 `json:"taxa_sistema_valor"`
	TaxaGatewayValor        float64 `json:"taxa_gateway_valor"`
	ValorLiquidoClinica     float64 `json:"valor_liquido_clinica"`
	Status                  string  `json:"status" gorm:"size:32;index"`
	Metodo                  string  `json:"metodo" gorm:"size:24"`
	ValorRecebido           *float64 `json:"valor_recebido,omitempty"`
	Troco                   *float64 `json:"troco,omitempty"`
	AsaasPaymentID          string  `json:"asaas_payment_id" gorm:"size:64;index"`
	PixCopiaECola           string  `json:"pix_copia_e_cola,omitempty" gorm:"type:text"`
	PixQRCodeBase64         string  `json:"pix_qr_code_base64,omitempty" gorm:"type:text"`
	LinkPagamento           string  `json:"link_pagamento,omitempty" gorm:"type:text"`
	WebhookUltimoEvento     string  `json:"webhook_ultimo_evento,omitempty" gorm:"size:64"`
	WebhookUltimoEm         *time.Time `json:"webhook_ultimo_em,omitempty"`
	LancamentoFinanceiroID  *uint   `json:"lancamento_financeiro_id,omitempty" gorm:"index"`
	UsuarioCriacaoID        uint    `json:"usuario_criacao_id" gorm:"index"`
}

func (CobrancaConsulta) TableName() string {
	return "cobranca_consultas"
}
