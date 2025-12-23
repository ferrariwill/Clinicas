package repositories

import (
	"github.com/ferrariwill/Clinicas/models"
	"gorm.io/gorm"
)

type ConfiguracaoRepository interface {
	BuscarPorClinica(clinicaID uint) (*models.ClinicaConfiguracao, error)
	CriarOuAtualizar(config *models.ClinicaConfiguracao) error
}

type configuracaoRepository struct {
	db *gorm.DB
}

func NovaConfiguracaoRepository(db *gorm.DB) ConfiguracaoRepository {
	return &configuracaoRepository{db: db}
}

func (r *configuracaoRepository) BuscarPorClinica(clinicaID uint) (*models.ClinicaConfiguracao, error) {
	var config models.ClinicaConfiguracao
	err := r.db.Where("clinica_id = ?", clinicaID).First(&config).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// Criar configuração padrão se não existir
			config = models.ClinicaConfiguracao{
				ClinicaID:              clinicaID,
				HorarioInicioSemana:    "08:00",
				HorarioFimSemana:       "18:00",
				HorarioInicioSabado:    "08:00",
				HorarioFimSabado:       "12:00",
				FuncionaDomingo:        false,
				IntervaloConsulta:      30,
				TempoAntecedencia:      24,
				LimiteAgendamentosDia:  50,
				PermiteAgendamentoFds:  false,
			}
			err = r.db.Create(&config).Error
			if err != nil {
				return nil, err
			}
		} else {
			return nil, err
		}
	}
	return &config, nil
}

func (r *configuracaoRepository) CriarOuAtualizar(config *models.ClinicaConfiguracao) error {
	var existente models.ClinicaConfiguracao
	err := r.db.Where("clinica_id = ?", config.ClinicaID).First(&existente).Error
	
	if err == gorm.ErrRecordNotFound {
		// Criar nova configuração
		return r.db.Create(config).Error
	} else if err != nil {
		return err
	}
	
	// Atualizar configuração existente
	config.ID = existente.ID
	return r.db.Save(config).Error
}