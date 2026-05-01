package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"os"
	"strings"
	"time"

	"github.com/ferrariwill/Clinicas/API/internal/paymentgateway"
	"github.com/ferrariwill/Clinicas/API/internal/paymentgateway/asaas"
	"github.com/ferrariwill/Clinicas/API/models"
	"github.com/ferrariwill/Clinicas/API/repositories"
	"github.com/ferrariwill/Clinicas/API/utils"
	"gorm.io/gorm"
)

type CobrancaService interface {
	ListarFila(clinicaID uint) ([]models.Agenda, error)
	CriarCobranca(clinicaID, usuarioID uint, agendaID uint, metodo string, valorRecebido *float64) (*models.CobrancaConsulta, error)
	BuscarCobranca(clinicaID, cobrancaID uint) (*models.CobrancaConsulta, error)
	RelatorioFinanceiro(clinicaID uint, inicio, fim *time.Time, incluirSemGateway bool) ([]models.CobrancaConsulta, error)
	ProcessarWebhookAsaas(body []byte) error
}

type cobrancaService struct {
	db           *gorm.DB
	cobRepo      repositories.CobrancaRepository
	agendaRepo   repositories.AgendaReposiory
	configRepo   repositories.ConfiguracaoRepository
	lanRepo      repositories.LancamentoFinanceiroRepository
	gateway      paymentgateway.Gateway
}

func NovaCobrancaService(
	db *gorm.DB,
	cobRepo repositories.CobrancaRepository,
	agendaRepo repositories.AgendaReposiory,
	configRepo repositories.ConfiguracaoRepository,
	lanRepo repositories.LancamentoFinanceiroRepository,
	gw paymentgateway.Gateway,
) CobrancaService {
	if gw == nil {
		gw = asaas.NewFromEnv()
	}
	return &cobrancaService{
		db:           db,
		cobRepo:      cobRepo,
		agendaRepo:   agendaRepo,
		configRepo:   configRepo,
		lanRepo: lanRepo,
		gateway:      gw,
	}
}

func valorTotalAgenda(a *models.Agenda) float64 {
	if a == nil {
		return 0
	}
	total := a.Procedimento.Valor
	for _, ap := range a.ProcedimentosExtras {
		total += ap.Procedimento.Valor
	}
	return total
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}

func metodoUsaGatewayRemoto(m string) bool {
	switch m {
	case models.CobrancaMetodoPix, models.CobrancaMetodoCreditCard:
		return true
	default:
		return false
	}
}

func (s *cobrancaService) registrarLancamentoFinanceiroConsulta(cob *models.CobrancaConsulta, origemResumo string) error {
	if cob.Status != models.CobrancaStatusPago || cob.LancamentoFinanceiroID != nil || cob.UsuarioCriacaoID == 0 {
		return nil
	}
	var ag models.Agenda
	if err := s.db.Preload("Paciente").First(&ag, cob.AgendaID).Error; err != nil {
		return err
	}
	pnome := strings.TrimSpace(ag.Paciente.Nome)
	desc := fmt.Sprintf(
		"Recebimento consulta (%s) ag #%d — Bruto R$ %.2f | Gateway R$ %.2f | Sistema (%%%.2f) R$ %.2f | Líquido R$ %.2f",
		origemResumo, cob.AgendaID, cob.ValorBruto, cob.TaxaGatewayValor, cob.PercentualSplitSnapshot, cob.TaxaSistemaValor, cob.ValorLiquidoClinica,
	)
	if pnome != "" {
		desc = desc + " — " + pnome
	}
	dh := time.Now().In(utils.LocSaoPaulo())
	dataL := time.Date(dh.Year(), dh.Month(), dh.Day(), 0, 0, 0, 0, utils.LocSaoPaulo())
	lf := models.LancamentoFinanceiro{
		ClinicaID: cob.ClinicaID,
		UsuarioID: cob.UsuarioCriacaoID,
		Data:      dataL,
		Descricao: desc,
		Valor:     cob.ValorLiquidoClinica,
		Tipo:      "RECEITA",
		Categoria: "PARTICULAR",
	}
	if err := s.lanRepo.Criar(&lf); err != nil {
		return err
	}
	cob.LancamentoFinanceiroID = &lf.ID
	return s.cobRepo.Atualizar(cob)
}

func (s *cobrancaService) ListarFila(clinicaID uint) ([]models.Agenda, error) {
	return s.cobRepo.ListarFilaPagamento(clinicaID)
}

func (s *cobrancaService) BuscarCobranca(clinicaID, cobrancaID uint) (*models.CobrancaConsulta, error) {
	return s.cobRepo.BuscarPorIDClinica(cobrancaID, clinicaID)
}

func (s *cobrancaService) RelatorioFinanceiro(clinicaID uint, inicio, fim *time.Time, incluirSemGateway bool) ([]models.CobrancaConsulta, error) {
	apenasGateway := !incluirSemGateway
	return s.cobRepo.ListarRelatorioPagas(clinicaID, inicio, fim, apenasGateway)
}

func (s *cobrancaService) CriarCobranca(clinicaID, usuarioID uint, agendaID uint, metodo string, valorRecebido *float64) (*models.CobrancaConsulta, error) {
	cfg, err := s.configRepo.BuscarPorClinica(clinicaID)
	if err != nil || cfg == nil {
		return nil, errors.New("configuração da clínica não encontrada")
	}
	if !cfg.UsaCobrancaIntegrada {
		return nil, errors.New("módulo de cobrança integrada não está ativo nas configurações da clínica")
	}
	pct := cfg.PercentualSplitSistema
	if pct < 0 || pct > 100 {
		return nil, errors.New("percentual_split_sistema deve estar entre 0 e 100")
	}

	m := strings.ToUpper(strings.TrimSpace(metodo))
	switch m {
	case models.CobrancaMetodoPix, models.CobrancaMetodoCreditCard, models.CobrancaMetodoDinheiro, models.CobrancaMetodoManual:
	default:
		return nil, errors.New("método inválido: use PIX, CREDIT_CARD, DINHEIRO ou MANUAL")
	}

	if _, err := s.agendaRepo.BuscarPorIDClinica(agendaID, clinicaID); err != nil {
		return nil, err
	}

	var full models.Agenda
	if err := s.db.Preload("Paciente").Preload("Procedimento").Preload("ProcedimentosExtras.Procedimento").
		Preload("StatusAgendamento").Where("id = ? AND clinica_id = ?", agendaID, clinicaID).First(&full).Error; err != nil {
		return nil, err
	}
	if full.LiberadoCobrancaEm == nil {
		return nil, errors.New("agendamento ainda não foi liberado para cobrança pelo profissional")
	}
	if full.ConvenioID != nil && *full.ConvenioID > 0 {
		return nil, errors.New("cobrança integrada não se aplica a agendamentos com convênio nesta versão")
	}
	st := strings.TrimSpace(full.StatusAgendamento.Nome)
	if !strings.EqualFold(st, "Realizado") {
		return nil, errors.New("somente consultas com status Realizado podem ser cobradas")
	}

	bruto := valorTotalAgenda(&full)
	if bruto <= 0 {
		return nil, errors.New("valor da consulta inválido")
	}

	ult, _ := s.cobRepo.UltimaPorAgenda(agendaID)
	if ult != nil && ult.Status == models.CobrancaStatusAguardando {
		if metodoUsaGatewayRemoto(m) && cfg.CadastroAsaasAtivo {
			return s.cobRepo.BuscarPorIDClinica(ult.ID, clinicaID)
		}
		return nil, errors.New("já existe cobrança pendente (Pix/cartão Asaas) para este agendamento")
	}
	if ult != nil && ult.Status == models.CobrancaStatusPago {
		return nil, errors.New("esta consulta já foi paga")
	}

	taxaSis := round2(bruto * pct / 100.0)
	liqEst := round2(bruto - taxaSis)

	// Baixa imediata (sem Asaas): dinheiro, manual, ou Pix/cartão quando o cadastro Asaas está desligado.
	if m == models.CobrancaMetodoManual || m == models.CobrancaMetodoDinheiro ||
		(metodoUsaGatewayRemoto(m) && !cfg.CadastroAsaasAtivo) {
		var vrPtr *float64
		var trocoPtr *float64
		if m == models.CobrancaMetodoDinheiro {
			if valorRecebido == nil {
				return nil, errors.New("informe valor_recebido para pagamento em dinheiro")
			}
			vr := round2(*valorRecebido)
			if vr+0.004 < bruto {
				return nil, errors.New("valor recebido é menor que o valor da consulta")
			}
			troco := round2(vr - bruto)
			vrPtr = &vr
			trocoPtr = &troco
		}

		row := &models.CobrancaConsulta{
			ClinicaID:               clinicaID,
			AgendaID:                agendaID,
			ValorBruto:              bruto,
			PercentualSplitSnapshot: pct,
			TaxaSistemaValor:        taxaSis,
			TaxaGatewayValor:        0,
			ValorLiquidoClinica:     liqEst,
			Status:                  models.CobrancaStatusPago,
			Metodo:                  m,
			ValorRecebido:           vrPtr,
			Troco:                   trocoPtr,
			UsuarioCriacaoID:        usuarioID,
		}
		if err := s.cobRepo.Criar(row); err != nil {
			return nil, err
		}
		var origem string
		switch m {
		case models.CobrancaMetodoDinheiro:
			origem = "dinheiro"
		case models.CobrancaMetodoPix:
			origem = "Pix (recepção, sem Asaas)"
		case models.CobrancaMetodoCreditCard:
			origem = "Cartão (recepção, sem Asaas)"
		default:
			origem = "recepção manual"
		}
		if err := s.registrarLancamentoFinanceiroConsulta(row, origem); err != nil {
			return nil, err
		}
		return s.cobRepo.BuscarPorIDClinica(row.ID, clinicaID)
	}

	// Pix / cartão — Asaas (cadastro ativo)
	wallet := strings.TrimSpace(os.Getenv("ASAAS_PLATFORM_WALLET_ID"))
	if pct > 0 && wallet == "" {
		return nil, errors.New("ASAAS_PLATFORM_WALLET_ID não configurado no servidor (necessário quando há split)")
	}

	pac := full.Paciente
	customerID := strings.TrimSpace(pac.AsaasCustomerID)
	ctx := context.Background()
	if customerID == "" {
		cid, errC := s.gateway.CriarCliente(ctx, paymentgateway.CobrancaCliente{
			Nome:     pac.Nome,
			CPFCNPJ:  pac.CPF,
			Email:    pac.Email,
			Telefone: pac.Telefone,
		})
		if errC != nil {
			return nil, fmt.Errorf("gateway: criar cliente: %w", errC)
		}
		customerID = cid
		_ = s.db.Model(&models.Paciente{}).Where("id = ?", pac.ID).Update("asaas_customer_id", customerID).Error
	}

	loc := utils.LocSaoPaulo()
	due := time.Now().In(loc).AddDate(0, 0, 3).Format("2006-01-02")
	desc := fmt.Sprintf("Consulta clínica ag #%d — %s", full.ID, strings.TrimSpace(pac.Nome))

	bt := "PIX"
	if m == models.CobrancaMetodoCreditCard {
		bt = "CREDIT_CARD"
	}
	in := paymentgateway.CriarCobrancaInput{
		ValorBruto:      bruto,
		DueDate:         due,
		Description:     desc,
		ExternalRef:     fmt.Sprintf("clinicas_agenda_%d", full.ID),
		CustomerID:      customerID,
		BillingType:     bt,
		SplitWalletID:   "",
		SplitPercentual: 0,
	}
	if pct > 0 && wallet != "" {
		in.SplitWalletID = wallet
		in.SplitPercentual = pct
	}
	res, errG := s.gateway.CriarCobranca(ctx, in)
	if errG != nil {
		return nil, errG
	}

	row := &models.CobrancaConsulta{
		ClinicaID:               clinicaID,
		AgendaID:                agendaID,
		ValorBruto:              bruto,
		PercentualSplitSnapshot: pct,
		TaxaSistemaValor:        taxaSis,
		TaxaGatewayValor:        0,
		ValorLiquidoClinica:     liqEst,
		Status:                  models.CobrancaStatusAguardando,
		Metodo:                  m,
		AsaasPaymentID:          res.PaymentID,
		PixCopiaECola:           res.PixCopiaECola,
		PixQRCodeBase64:         res.PixQRCodeBase64,
		LinkPagamento:           res.InvoiceURL,
		UsuarioCriacaoID:        usuarioID,
	}
	if err := s.cobRepo.Criar(row); err != nil {
		return nil, err
	}
	return s.cobRepo.BuscarPorIDClinica(row.ID, clinicaID)
}

type asaasWebhookEnvelope struct {
	Event   string          `json:"event"`
	Payment json.RawMessage `json:"payment"`
}

type asaasPaymentWebhook struct {
	ID       string  `json:"id"`
	Status   string  `json:"status"`
	Value    float64 `json:"value"`
	NetValue float64 `json:"netValue"`
}

func (s *cobrancaService) ProcessarWebhookAsaas(body []byte) error {
	var env asaasWebhookEnvelope
	if err := json.Unmarshal(body, &env); err != nil {
		return err
	}
	var pay asaasPaymentWebhook
	if err := json.Unmarshal(env.Payment, &pay); err != nil || pay.ID == "" {
		return errors.New("payload de pagamento inválido")
	}

	cob, err := s.cobRepo.BuscarPorAsaasPaymentID(pay.ID)
	if err != nil || cob == nil {
		return fmt.Errorf("cobrança não encontrada para payment_id=%s", pay.ID)
	}

	ev := strings.ToUpper(strings.TrimSpace(env.Event))
	st := strings.ToUpper(strings.TrimSpace(pay.Status))

	switch {
	case strings.Contains(ev, "RECEIVED") || strings.Contains(ev, "CONFIRMED") || st == "RECEIVED" || st == "CONFIRMED":
		cob.Status = models.CobrancaStatusPago
	case strings.Contains(ev, "REFUNDED") || strings.Contains(ev, "DELETED") || st == "REFUNDED":
		cob.Status = models.CobrancaStatusRecusado
	default:
		if st == "OVERDUE" {
			cob.Status = models.CobrancaStatusRecusado
		}
	}

	now := time.Now()
	cob.WebhookUltimoEvento = env.Event
	cob.WebhookUltimoEm = &now

	if pay.Value > 0 && pay.NetValue >= 0 {
		asasFee := round2(math.Max(0, pay.Value-pay.NetValue))
		cob.TaxaGatewayValor = round2(math.Max(0, asasFee))
		cob.ValorLiquidoClinica = round2(math.Max(0, pay.NetValue-cob.TaxaSistemaValor))
	}

	if err := s.cobRepo.Atualizar(cob); err != nil {
		return err
	}

	if cob.Status == models.CobrancaStatusPago {
		return s.registrarLancamentoFinanceiroConsulta(cob, "Asaas")
	}
	return nil
}
