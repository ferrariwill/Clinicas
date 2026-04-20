package services

import (
	"time"

	"github.com/ferrariwill/Clinicas/API/models"
	"github.com/ferrariwill/Clinicas/API/repositories"
)

type LancamentoFinanceiroService interface {
	Criar(clinicaID, usuarioID uint, descricao string, valor float64, tipo, categoria string, data *time.Time) (*models.LancamentoFinanceiro, error)
	Listar(clinicaID uint, inicio, fim *time.Time, categoria *string) ([]models.LancamentoFinanceiro, error)
	Resumo(clinicaID uint, inicio, fim time.Time) (totalEntradas, totalSaidas, saldoLiquido float64, err error)
}

type lancamentoFinanceiroService struct {
	repo repositories.LancamentoFinanceiroRepository
}

func NovoLancamentoFinanceiroService(repo repositories.LancamentoFinanceiroRepository) LancamentoFinanceiroService {
	return &lancamentoFinanceiroService{repo: repo}
}

func (s *lancamentoFinanceiroService) Criar(clinicaID, usuarioID uint, descricao string, valor float64, tipo, categoria string, data *time.Time) (*models.LancamentoFinanceiro, error) {
	d := time.Now()
	if data != nil {
		d = *data
	}
	d = time.Date(d.Year(), d.Month(), d.Day(), 0, 0, 0, 0, d.Location())
	l := &models.LancamentoFinanceiro{
		ClinicaID: clinicaID,
		UsuarioID: usuarioID,
		Data:      d,
		Descricao: descricao,
		Valor:     valor,
		Tipo:      tipo,
		Categoria: categoria,
	}
	if err := s.repo.Criar(l); err != nil {
		return nil, err
	}
	return l, nil
}

func (s *lancamentoFinanceiroService) Listar(clinicaID uint, inicio, fim *time.Time, categoria *string) ([]models.LancamentoFinanceiro, error) {
	return s.repo.Listar(clinicaID, inicio, fim, categoria)
}

func (s *lancamentoFinanceiroService) Resumo(clinicaID uint, inicio, fim time.Time) (totalEntradas, totalSaidas, saldoLiquido float64, err error) {
	inicio = time.Date(inicio.Year(), inicio.Month(), inicio.Day(), 0, 0, 0, 0, inicio.Location())
	fim = time.Date(fim.Year(), fim.Month(), fim.Day(), 0, 0, 0, 0, fim.Location())
	ent, sai, err := s.repo.Resumo(clinicaID, inicio, fim)
	if err != nil {
		return 0, 0, 0, err
	}
	return ent, sai, ent - sai, nil
}
