package services

import (
	"encoding/json"
	"errors"
	"math"
	"time"

	DTO "github.com/ferrariwill/Clinicas/API/models/DTO"
	"github.com/ferrariwill/Clinicas/API/models"
	"github.com/ferrariwill/Clinicas/API/repositories"
	"gorm.io/gorm"
)

type repasseRelatorioProvider interface {
	RelatorioRepasseProfissionais(clinicaID uint, inicio, fim *time.Time, incluirSemGateway bool) ([]models.RelatorioRepasseProfissionalLinha, []models.RelatorioRepasseProfissionalDetalhe, error)
}

type FechamentoFinanceiroService interface {
	CriarFechamento(clinicaID uint, dataInicio, dataFim time.Time) (*models.FechamentoPeriodo, error)
	PreviewFechamento(clinicaID uint, dataInicio, dataFim time.Time) (*DTO.FechamentoPreviewResponse, error)
	ListarFechamentos(clinicaID uint) ([]DTO.FechamentoListaItem, error)
	BuscarFechamento(clinicaID, id uint) (*models.FechamentoPeriodo, error)
}

type fechamentoFinanceiroService struct {
	db       *gorm.DB
	lanRepo  repositories.LancamentoFinanceiroRepository
	fechRepo repositories.FechamentoPeriodoRepository
	repasse  repasseRelatorioProvider
}

func NovoFechamentoFinanceiroService(
	db *gorm.DB,
	lanRepo repositories.LancamentoFinanceiroRepository,
	fechRepo repositories.FechamentoPeriodoRepository,
	repasse repasseRelatorioProvider,
) FechamentoFinanceiroService {
	return &fechamentoFinanceiroService{db: db, lanRepo: lanRepo, fechRepo: fechRepo, repasse: repasse}
}

func roundFechamentoMoney(v float64) float64 {
	return math.Round(v*100) / 100
}

type fechamentoDetalheLancamento struct {
	ID        uint    `json:"id"`
	Data      string  `json:"data"`
	Descricao string  `json:"descricao"`
	Valor     float64 `json:"valor"`
	Tipo      string  `json:"tipo"`
	Categoria string  `json:"categoria"`
	UsuarioID uint    `json:"usuario_id"`
	CriadoEm  string  `json:"criado_em"`
}

type fechamentoDetalhamentoJSON struct {
	Lancamentos     []fechamentoDetalheLancamento                  `json:"lancamentos"`
	RepasseLinhas   []models.RelatorioRepasseProfissionalLinha     `json:"repasse_linhas"`
	RepasseDetalhes []models.RelatorioRepasseProfissionalDetalhe `json:"repasse_detalhes"`
}

type computoFechamento struct {
	payload       fechamentoDetalhamentoJSON
	totalEntradas float64
	totalSaidas   float64
	totalRepasses float64
	lucroLiquido  float64
	lancamentoIDs []uint
}

func normalizarPeriodoFechamento(dataInicio, dataFim time.Time) (di, df, fimRepasse time.Time, err error) {
	loc := dataInicio.Location()
	di = time.Date(dataInicio.Year(), dataInicio.Month(), dataInicio.Day(), 0, 0, 0, 0, loc)
	df = time.Date(dataFim.Year(), dataFim.Month(), dataFim.Day(), 0, 0, 0, 0, loc)
	if df.Before(di) {
		return di, df, fimRepasse, errors.New("data_fim deve ser maior ou igual a data_inicio")
	}
	fimRepasse = time.Date(df.Year(), df.Month(), df.Day(), 23, 59, 59, 999999999, loc)
	return di, df, fimRepasse, nil
}

func (s *fechamentoFinanceiroService) montarComputo(clinicaID uint, di, df, fimRepasse time.Time) (*computoFechamento, error) {
	lancs, err := s.lanRepo.ListarLivresParaFechamento(clinicaID, di, df)
	if err != nil {
		return nil, err
	}

	linhas, detalhes, err := s.repasse.RelatorioRepasseProfissionais(clinicaID, &di, &fimRepasse, true)
	if err != nil {
		return nil, err
	}

	var totalEntradas, totalSaidas float64
	detLan := make([]fechamentoDetalheLancamento, 0, len(lancs))
	ids := make([]uint, 0, len(lancs))
	for i := range lancs {
		l := &lancs[i]
		ids = append(ids, l.ID)
		v := l.Valor
		switch l.Tipo {
		case "RECEITA":
			totalEntradas += v
		case "DESPESA":
			totalSaidas += v
		}
		detLan = append(detLan, fechamentoDetalheLancamento{
			ID:        l.ID,
			Data:      l.Data.Format("2006-01-02"),
			Descricao: l.Descricao,
			Valor:     l.Valor,
			Tipo:      l.Tipo,
			Categoria: l.Categoria,
			UsuarioID: l.UsuarioID,
			CriadoEm:  l.CreatedAt.Format(time.RFC3339),
		})
	}
	totalEntradas = roundFechamentoMoney(totalEntradas)
	totalSaidas = roundFechamentoMoney(totalSaidas)

	var totalRepasses float64
	for i := range detalhes {
		totalRepasses += detalhes[i].ValorRepasse
	}
	totalRepasses = roundFechamentoMoney(totalRepasses)

	lucro := roundFechamentoMoney(totalEntradas - totalSaidas - totalRepasses)

	return &computoFechamento{
		payload: fechamentoDetalhamentoJSON{
			Lancamentos:     detLan,
			RepasseLinhas:   linhas,
			RepasseDetalhes: detalhes,
		},
		totalEntradas: totalEntradas,
		totalSaidas:     totalSaidas,
		totalRepasses: totalRepasses,
		lucroLiquido:  lucro,
		lancamentoIDs: ids,
	}, nil
}

func (s *fechamentoFinanceiroService) PreviewFechamento(clinicaID uint, dataInicio, dataFim time.Time) (*DTO.FechamentoPreviewResponse, error) {
	di, df, fimRepasse, err := normalizarPeriodoFechamento(dataInicio, dataFim)
	if err != nil {
		return nil, err
	}
	c, err := s.montarComputo(clinicaID, di, df, fimRepasse)
	if err != nil {
		return nil, err
	}
	raw, err := json.Marshal(c.payload)
	if err != nil {
		return nil, err
	}
	return &DTO.FechamentoPreviewResponse{
		DataInicio:             di.Format("2006-01-02"),
		DataFim:                df.Format("2006-01-02"),
		QuantidadeLancamentos:  len(c.payload.Lancamentos),
		QuantidadeItensRepasse: len(c.payload.RepasseDetalhes),
		TotalEntradas:          c.totalEntradas,
		TotalSaidas:            c.totalSaidas,
		TotalRepasses:          c.totalRepasses,
		LucroLiquido:           c.lucroLiquido,
		Detalhamento:           raw,
	}, nil
}

func (s *fechamentoFinanceiroService) ListarFechamentos(clinicaID uint) ([]DTO.FechamentoListaItem, error) {
	rows, err := s.fechRepo.ListarPorClinica(clinicaID)
	if err != nil {
		return nil, err
	}
	out := make([]DTO.FechamentoListaItem, 0, len(rows))
	for i := range rows {
		r := &rows[i]
		out = append(out, DTO.FechamentoListaItem{
			ID:            r.ID,
			DataInicio:    r.DataInicio.Format("2006-01-02"),
			DataFim:       r.DataFim.Format("2006-01-02"),
			TotalEntradas: r.TotalEntradas,
			TotalSaidas:   r.TotalSaidas,
			TotalRepasses: r.TotalRepasses,
			LucroLiquido:  r.LucroLiquido,
			Status:        r.Status,
			CriadoEm:      r.CreatedAt.Format(time.RFC3339),
		})
	}
	return out, nil
}

func (s *fechamentoFinanceiroService) BuscarFechamento(clinicaID, id uint) (*models.FechamentoPeriodo, error) {
	return s.fechRepo.BuscarPorIDClinica(id, clinicaID)
}

func (s *fechamentoFinanceiroService) CriarFechamento(clinicaID uint, dataInicio, dataFim time.Time) (*models.FechamentoPeriodo, error) {
	di, df, fimRepasse, err := normalizarPeriodoFechamento(dataInicio, dataFim)
	if err != nil {
		return nil, err
	}
	c, err := s.montarComputo(clinicaID, di, df, fimRepasse)
	if err != nil {
		return nil, err
	}
	raw, err := json.Marshal(c.payload)
	if err != nil {
		return nil, err
	}

	fp := &models.FechamentoPeriodo{
		ClinicaID:        clinicaID,
		DataInicio:       di,
		DataFim:          df,
		TotalEntradas:    c.totalEntradas,
		TotalSaidas:      c.totalSaidas,
		TotalRepasses:    c.totalRepasses,
		LucroLiquido:     c.lucroLiquido,
		Status:           models.StatusFechamentoFinalizado,
		DetalhamentoJSON: raw,
	}

	err = s.db.Transaction(func(tx *gorm.DB) error {
		if err := s.fechRepo.Criar(tx, fp); err != nil {
			return err
		}
		if fp.ID == 0 {
			return errors.New("fechamento sem ID após persistência")
		}
		return s.lanRepo.VincularFechamentoPeriodo(tx, clinicaID, fp.ID, c.lancamentoIDs)
	})
	if err != nil {
		return nil, err
	}
	return fp, nil
}
