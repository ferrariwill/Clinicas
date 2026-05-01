package repositories

import (
	"errors"
	"time"

	"github.com/ferrariwill/Clinicas/API/models"
	"gorm.io/gorm"
)

type CobrancaRepository interface {
	Criar(row *models.CobrancaConsulta) error
	Atualizar(row *models.CobrancaConsulta) error
	BuscarPorIDClinica(id, clinicaID uint) (*models.CobrancaConsulta, error)
	BuscarPorAsaasPaymentID(paymentID string) (*models.CobrancaConsulta, error)
	UltimaPorAgenda(agendaID uint) (*models.CobrancaConsulta, error)
	ListarFilaPagamento(clinicaID uint) ([]models.Agenda, error)
	ListarRelatorioPagas(clinicaID uint, inicio, fim *time.Time, apenasComGatewayAsaas bool) ([]models.CobrancaConsulta, error)
}

type cobrancaRepository struct {
	db *gorm.DB
}

func NovaCobrancaRepository(db *gorm.DB) CobrancaRepository {
	return &cobrancaRepository{db: db}
}

func (r *cobrancaRepository) Criar(row *models.CobrancaConsulta) error {
	return r.db.Create(row).Error
}

func (r *cobrancaRepository) Atualizar(row *models.CobrancaConsulta) error {
	return r.db.Save(row).Error
}

func (r *cobrancaRepository) BuscarPorIDClinica(id, clinicaID uint) (*models.CobrancaConsulta, error) {
	var c models.CobrancaConsulta
	err := r.db.Where("id = ? AND clinica_id = ?", id, clinicaID).First(&c).Error
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *cobrancaRepository) BuscarPorAsaasPaymentID(paymentID string) (*models.CobrancaConsulta, error) {
	var c models.CobrancaConsulta
	err := r.db.Where("asaas_payment_id = ?", paymentID).First(&c).Error
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *cobrancaRepository) UltimaPorAgenda(agendaID uint) (*models.CobrancaConsulta, error) {
	var c models.CobrancaConsulta
	err := r.db.Where("agenda_id = ?", agendaID).Order("id desc").First(&c).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *cobrancaRepository) ListarFilaPagamento(clinicaID uint) ([]models.Agenda, error) {
	var agendas []models.Agenda
	q := r.db.Model(&models.Agenda{}).
		Preload("Paciente").
		Preload("Usuario").
		Preload("Procedimento").
		Preload("ProcedimentosExtras.Procedimento").
		Preload("StatusAgendamento").
		Joins("JOIN status_agendamentos sa ON sa.id = agendas.status_agendamento_id").
		Where("LOWER(TRIM(sa.nome)) = ?", "realizado").
		Where("agendas.clinica_id = ?", clinicaID).
		Where("agendas.liberado_cobranca_em IS NOT NULL").
		Where("NOT EXISTS (SELECT 1 FROM cobranca_consultas c WHERE c.agenda_id = agendas.id AND c.deleted_at IS NULL AND c.status = ?)", models.CobrancaStatusPago).
		Order("agendas.data_hora DESC")
	if err := q.Find(&agendas).Error; err != nil {
		return nil, err
	}
	return agendas, nil
}

func (r *cobrancaRepository) ListarRelatorioPagas(clinicaID uint, inicio, fim *time.Time, apenasComGatewayAsaas bool) ([]models.CobrancaConsulta, error) {
	var rows []models.CobrancaConsulta
	q := r.db.Where("clinica_id = ? AND status = ?", clinicaID, models.CobrancaStatusPago).
		Preload("Agenda.Paciente").
		Preload("Agenda.Procedimento").
		Preload("Agenda.ProcedimentosExtras.Procedimento").
		Order("updated_at DESC")
	if apenasComGatewayAsaas {
		// Pix/cartão liquidados no Asaas; exclui baixa só na recepção (sem payment id).
		q = q.Where("asaas_payment_id IS NOT NULL AND TRIM(asaas_payment_id) <> ''")
	}
	if inicio != nil {
		q = q.Where("updated_at >= ?", *inicio)
	}
	if fim != nil {
		q = q.Where("updated_at <= ?", *fim)
	}
	if err := q.Find(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}
