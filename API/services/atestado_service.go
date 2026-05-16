package services

import (
	"errors"
	"regexp"
	"strings"
	"time"

	"github.com/ferrariwill/Clinicas/API/internal/especialidade"
	"github.com/ferrariwill/Clinicas/API/internal/rbac"
	"github.com/ferrariwill/Clinicas/API/models"
	"github.com/ferrariwill/Clinicas/API/repositories"
	"github.com/ferrariwill/Clinicas/API/utils"
	"gorm.io/gorm"
)

var (
	ErrAtestadoCID10Obrigatorio = errors.New("CID-10 é obrigatório")
	ErrAtestadoTipoInvalido     = errors.New("tipo deve ser HORAS ou DIAS")
	ErrAtestadoQuantidade       = errors.New("quantidade deve ser entre 1 e 999")
	ErrAtestadoEspecialidade    = errors.New("atestado disponível apenas para profissionais com especialidade Médico, Fisioterapia ou Odontologia")
	ErrAtestadoCID10Formato     = errors.New("CID-10 inválido: use uma letra, dois dígitos e subcódigo opcional (ex.: J06.9)")
	ErrAtestadoHorasConsultaPar = errors.New("informe hora de início e fim da consulta, ou deixe ambos em branco")
	ErrAtestadoHorasConsultaFmt = errors.New("horários da consulta devem estar no formato 24h HH:MM (ex.: 08:30)")
)

var cid10FormatoValido = regexp.MustCompile(`^[A-Z]\d{2}(\.\d{1,4})?$`)
var horaConsulta24Re = regexp.MustCompile(`^(?:[01]\d|2[0-3]):[0-5]\d$`)

type AtestadoService interface {
	Criar(clinicaID, profissionalID uint, espToken string, in *models.AtestadoMedico, pacienteNome, pacienteCPF, profNome, espProf string, consultaHoraInicio, consultaHoraFim string) error
	ListarPorPaciente(clinicaID, pacienteID uint, papel string) ([]models.AtestadoMedico, error)
}

type atestadoService struct {
	repo         repositories.AtestadoRepository
	pacienteRepo repositories.PacienteRepository
}

func NovoAtestadoService(repo repositories.AtestadoRepository, pacienteRepo repositories.PacienteRepository) AtestadoService {
	return &atestadoService{repo: repo, pacienteRepo: pacienteRepo}
}

func (s *atestadoService) podeEmitirPorEspecialidade(espToken string) bool {
	return especialidade.Valida(espToken)
}

func (s *atestadoService) Criar(clinicaID, profissionalID uint, espToken string, in *models.AtestadoMedico, pacienteNome, pacienteCPF, profNome, espProf string, consultaHoraInicio, consultaHoraFim string) error {
	if !s.podeEmitirPorEspecialidade(espToken) {
		return ErrAtestadoEspecialidade
	}
	if in.PacienteID == 0 {
		return errors.New("paciente é obrigatório")
	}
	_, err := s.pacienteRepo.BuscarPorIDClinica(in.PacienteID, clinicaID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("paciente não encontrado nesta clínica")
		}
		return err
	}
	tipo := strings.ToUpper(strings.TrimSpace(in.Tipo))
	if tipo != atestadoTipoHoras && tipo != atestadoTipoDias {
		return ErrAtestadoTipoInvalido
	}
	if in.Quantidade < 1 || in.Quantidade > 999 {
		return ErrAtestadoQuantidade
	}
	cid := strings.TrimSpace(in.CID10)
	if cid == "" {
		return ErrAtestadoCID10Obrigatorio
	}
	cid = normalizarCID10API(cid)
	if !cid10FormatoValido.MatchString(cid) {
		return ErrAtestadoCID10Formato
	}

	ci := strings.TrimSpace(consultaHoraInicio)
	cf := strings.TrimSpace(consultaHoraFim)
	if (ci == "") != (cf == "") {
		return ErrAtestadoHorasConsultaPar
	}
	if ci != "" && (!horaConsulta24Re.MatchString(ci) || !horaConsulta24Re.MatchString(cf)) {
		return ErrAtestadoHorasConsultaFmt
	}

	texto := MontarTextoAtestadoPT(pacienteNome, pacienteCPF, tipo, in.Quantidade, cid, profNome, espProf, time.Now(), ci, cf)

	encTexto, err := utils.EncryptSensitiveField(texto)
	if err != nil {
		return err
	}
	encCID, err := utils.EncryptSensitiveField(strings.ToUpper(cid))
	if err != nil {
		return err
	}

	in.Tipo = tipo
	in.CID10 = encCID
	in.TextoGerado = encTexto
	in.ProfissionalID = profissionalID

	return s.repo.Criar(clinicaID, in)
}

// normalizarCID10API alinha dígitos após a categoria (ex.: J069 → J06.9).
func normalizarCID10API(s string) string {
	s = strings.TrimSpace(strings.ToUpper(s))
	var b strings.Builder
	for _, r := range s {
		if (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
		}
	}
	t := b.String()
	if len(t) == 0 {
		return ""
	}
	if t[0] < 'A' || t[0] > 'Z' {
		return t
	}
	if len(t) <= 3 {
		return t
	}
	return t[:3] + "." + t[3:]
}

func (s *atestadoService) ListarPorPaciente(clinicaID, pacienteID uint, papel string) ([]models.AtestadoMedico, error) {
	_, err := s.pacienteRepo.BuscarPorIDClinica(pacienteID, clinicaID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("paciente não encontrado nesta clínica")
		}
		return nil, err
	}
	list, err := s.repo.ListarPorPaciente(clinicaID, pacienteID)
	if err != nil {
		return nil, err
	}
	canDecrypt := rbac.PodeDescriptografarProntuario(papel)
	for i := range list {
		if !canDecrypt {
			list[i].TextoGerado = ""
			list[i].CID10 = "••••"
			continue
		}
		t, err := utils.DecryptSensitiveField(list[i].TextoGerado)
		if err != nil {
			return nil, err
		}
		c, err := utils.DecryptSensitiveField(list[i].CID10)
		if err != nil {
			return nil, err
		}
		list[i].TextoGerado = t
		list[i].CID10 = c
	}
	return list, nil
}
