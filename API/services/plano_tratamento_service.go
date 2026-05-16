package services

import (
	"errors"
	"fmt"
	"strings"
	"time"

	dto "github.com/ferrariwill/Clinicas/API/models/DTO"
	"github.com/ferrariwill/Clinicas/API/models"
	"github.com/ferrariwill/Clinicas/API/utils"
)

type PlanoTratamentoResult struct {
	ProntuarioID uint            `json:"prontuario_id"`
	Agendas      []models.Agenda `json:"agendas"`
	Aviso        string          `json:"aviso,omitempty"`
	// InformarSecretaria texto para a recepção agendar (agenda não é mais criada pelo plano).
	InformarSecretaria string `json:"informar_secretaria,omitempty"`
}

type PlanoTratamentoService struct {
	pront    ProntuarioService
	paciente PacienteService
}

func NovoPlanoTratamentoService(pront ProntuarioService, paciente PacienteService) *PlanoTratamentoService {
	return &PlanoTratamentoService{pront: pront, paciente: paciente}
}

func (s *PlanoTratamentoService) Registrar(clinicaID, profissionalID uint, req dto.PlanoTratamentoRequest) (*PlanoTratamentoResult, error) {
	if req.PacienteID == 0 || req.UsuarioID == 0 || req.ProcedimentoID == 0 {
		return nil, errors.New("dados incompletos")
	}
	pac, err := s.paciente.BuscarPorIDClinica(req.PacienteID, clinicaID)
	if err != nil {
		return nil, errors.New("paciente não encontrado nesta clínica")
	}

	t0, err := utils.ParseAgendaDataHora(req.DataHora)
	if err != nil {
		return nil, err
	}

	intervalo := req.IntervaloDias
	if intervalo <= 0 {
		intervalo = 7
	}
	if intervalo > 60 {
		intervalo = 60
	}

	var linhasProntuario []string
	var slots []time.Time

	switch strings.ToUpper(strings.TrimSpace(req.Modo)) {
	case "RETORNO":
		linhasProntuario = append(linhasProntuario,
			"MODO: RETORNO",
			"DATA/HORA PREVISTA: "+t0.In(utils.LocSaoPaulo()).Format("02/01/2006 15:04"),
		)
		slots = append(slots, t0)
		pac.PlanoSessoesPrevistas = nil
		tr := t0.In(utils.LocSaoPaulo())
		pac.PlanoRetornoPrevistoEm = &tr

	case "SESSOES":
		if req.SessoesPrevistas == nil || *req.SessoesPrevistas < 1 || *req.SessoesPrevistas > 52 {
			return nil, errors.New("informe sessoes_previstas entre 1 e 52")
		}
		n := *req.SessoesPrevistas
		pac.PlanoSessoesPrevistas = &n
		tr := t0.In(utils.LocSaoPaulo())
		pac.PlanoRetornoPrevistoEm = &tr

		linhasProntuario = append(linhasProntuario,
			"MODO: SESSOES PREVISTAS",
			fmt.Sprintf("TOTAL DE SESSOES: %d", n),
			fmt.Sprintf("INTERVALO ENTRE SESSOES: %d DIAS", intervalo),
			"SESSAO 1 / "+t0.In(utils.LocSaoPaulo()).Format("02/01/2006 15:04"),
		)
		slots = append(slots, t0)
		for i := 1; i < n; i++ {
			ti := t0.AddDate(0, 0, intervalo*i)
			slots = append(slots, ti)
			linhasProntuario = append(linhasProntuario,
				fmt.Sprintf("SESSAO %d / %s", i+1, ti.In(utils.LocSaoPaulo()).Format("02/01/2006 15:04")),
			)
		}
	default:
		return nil, errors.New("modo inválido")
	}

	if obs := strings.TrimSpace(req.Observacoes); obs != "" {
		linhasProntuario = append(linhasProntuario, "OBSERVACOES: "+obs)
	}

	conteudo := strings.Join(linhasProntuario, "\n")
	reg := &models.ProntuarioRegistro{
		PacienteID: req.PacienteID,
		Titulo:     "PLANO DE TRATAMENTO",
		Conteudo:   conteudo,
	}
	if err := s.pront.Criar(clinicaID, profissionalID, reg); err != nil {
		return nil, err
	}

	if err := s.paciente.AtualizarPaciente(pac); err != nil {
		return nil, fmt.Errorf("plano salvo no prontuário mas falha ao atualizar paciente: %w", err)
	}

	// Agendamentos ficam a cargo da secretaria/gestão (POST /clinicas/agenda); aqui só documentamos o pedido.
	informar := mensagemInformarSecretaria(pac.Nome, req, strings.TrimSpace(req.Modo), slots, intervalo)
	res := &PlanoTratamentoResult{
		ProntuarioID:       reg.ID,
		Agendas:            nil,
		InformarSecretaria: informar,
		Aviso:              informar,
	}
	return res, nil
}

func mensagemInformarSecretaria(pacNome string, req dto.PlanoTratamentoRequest, modo string, slots []time.Time, intervaloDias int) string {
	loc := utils.LocSaoPaulo()
	m := strings.ToUpper(strings.TrimSpace(modo))
	var b strings.Builder
	b.WriteString("A secretaria ou a gestão da clínica deve registrar o(s) horário(s) na agenda. ")
	b.WriteString("O médico já salvou o plano no prontuário e os lembretes no cadastro do paciente.\n\n")
	b.WriteString("Paciente: ")
	b.WriteString(strings.TrimSpace(pacNome))
	b.WriteString(fmt.Sprintf("\nProfissional (usuário): %d\nProcedimento: %d\n", req.UsuarioID, req.ProcedimentoID))
	if m == "RETORNO" && len(slots) > 0 {
		b.WriteString("Retorno solicitado para: ")
		b.WriteString(slots[0].In(loc).Format("02/01/2006 15:04"))
		b.WriteString(".")
		return b.String()
	}
	if m == "SESSOES" && len(slots) > 0 {
		b.WriteString(fmt.Sprintf("Plano por sessões: %d horário(s) de referência; intervalo sugerido %d dia(s) entre sessões.\n", len(slots), intervaloDias))
		b.WriteString("Datas indicadas pelo médico (agendar conforme disponibilidade na grade):\n")
		maxLinhas := 16
		for i, s := range slots {
			if i >= maxLinhas {
				b.WriteString(fmt.Sprintf("… e mais %d data(s).\n", len(slots)-maxLinhas))
				break
			}
			b.WriteString("- ")
			b.WriteString(s.In(loc).Format("02/01/2006 15:04"))
			b.WriteString("\n")
		}
		return b.String()
	}
	return b.String()
}
