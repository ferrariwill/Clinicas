package services

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	dto "github.com/ferrariwill/Clinicas/API/models/DTO"
	"github.com/ferrariwill/Clinicas/API/models"
	"github.com/ferrariwill/Clinicas/API/repositories"
	"github.com/ferrariwill/Clinicas/API/utils"
	"gorm.io/gorm"
)

const maxDiasProjecaoLote = 800

func parseHoraHHMM(s string) (hour, min int, err error) {
	s = strings.TrimSpace(s)
	parts := strings.Split(s, ":")
	if len(parts) != 2 {
		return 0, 0, errors.New("hora inválida: use HH:mm (ex.: 14:30)")
	}
	h, e1 := strconv.Atoi(parts[0])
	m, e2 := strconv.Atoi(parts[1])
	if e1 != nil || e2 != nil || h < 0 || h > 23 || m < 0 || m > 59 {
		return 0, 0, errors.New("hora inválida: use HH:mm entre 00:00 e 23:59")
	}
	return h, m, nil
}

func diasSemanaUnicos(dias []int) (map[time.Weekday]struct{}, error) {
	set := make(map[time.Weekday]struct{})
	for _, d := range dias {
		if d < 0 || d > 6 {
			return nil, errors.New("dias_semana deve conter valores de 0 (domingo) a 6 (sábado)")
		}
		set[time.Weekday(d)] = struct{}{}
	}
	if len(set) == 0 {
		return nil, errors.New("informe ao menos um dia da semana")
	}
	return set, nil
}

func projetarDatasLote(dataRef time.Time, dias map[time.Weekday]struct{}, hh, mm, quantidade int, loc *time.Location) ([]time.Time, error) {
	ref := time.Date(dataRef.Year(), dataRef.Month(), dataRef.Day(), 0, 0, 0, 0, loc)
	out := make([]time.Time, 0, quantidade)
	for off := 0; len(out) < quantidade && off < maxDiasProjecaoLote; off++ {
		day := ref.AddDate(0, 0, off)
		if _, ok := dias[day.Weekday()]; !ok {
			continue
		}
		cand := time.Date(day.Year(), day.Month(), day.Day(), hh, mm, 0, 0, loc)
		out = append(out, cand)
	}
	if len(out) < quantidade {
		return nil, fmt.Errorf("não foi possível projetar %d sessões nos próximos %d dias com os dias da semana informados; amplie o intervalo ou ajuste a data de referência", quantidade, maxDiasProjecaoLote)
	}
	return out, nil
}

func agendaLoteBase(clinicaID, pacienteID, usuarioID, procedimentoID uint, convenioID *uint, obs string, statusID uint, dataHora time.Time) models.Agenda {
	return models.Agenda{
		PacienteID:          pacienteID,
		UsuarioID:           usuarioID,
		ClinicaID:           clinicaID,
		ProcedimentoID:      procedimentoID,
		ConvenioID:          convenioID,
		DataHora:            dataHora,
		Observacoes:         obs,
		StatusAgendamentoID: statusID,
	}
}

func resolverProcedimentoIDsLote(procedimentoID uint, procedimentoIDs []uint) ([]uint, error) {
	ids := procedimentoIDs
	if len(ids) == 0 {
		if procedimentoID == 0 {
			return nil, errors.New("informe procedimento_id ou procedimento_ids")
		}
		ids = []uint{procedimentoID}
	}
	if procedimentoID != 0 && (len(ids) == 0 || ids[0] != procedimentoID) {
		ids = append([]uint{procedimentoID}, ids...)
	}
	seen := make(map[uint]struct{})
	uniq := make([]uint, 0, len(ids))
	for _, id := range ids {
		if id == 0 {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		uniq = append(uniq, id)
	}
	if len(uniq) == 0 {
		return nil, errors.New("informe ao menos um procedimento válido")
	}
	return uniq, nil
}

func (s *agendaService) PreviewAgendaLote(clinicaID uint, req dto.PreviewAgendaLoteRequest) ([]dto.PreviewAgendaLoteSessaoResponse, error) {
	ids, err := resolverProcedimentoIDsLote(req.ProcedimentoID, req.ProcedimentoIDs)
	if err != nil {
		return nil, err
	}
	principal := ids[0]
	extras := []uint{}
	if len(ids) > 1 {
		extras = append(extras, ids[1:]...)
	}

	loc := utils.LocSaoPaulo()
	ref, err := time.ParseInLocation("2006-01-02", strings.TrimSpace(req.DataReferencia), loc)
	if err != nil {
		return nil, errors.New("data_referencia inválida: use YYYY-MM-DD")
	}
	hh, mm, err := parseHoraHHMM(req.Hora)
	if err != nil {
		return nil, err
	}
	dias, err := diasSemanaUnicos(req.DiasSemana)
	if err != nil {
		return nil, err
	}
	datas, err := projetarDatasLote(ref, dias, hh, mm, req.QuantidadeSessoes, loc)
	if err != nil {
		return nil, err
	}

	_, err = s.pacienteRepo.BuscarPorIDClinica(req.PacienteID, clinicaID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("paciente não encontrado nesta clínica")
		}
		return nil, err
	}

	out := make([]dto.PreviewAgendaLoteSessaoResponse, 0, len(datas))
	for i, t := range datas {
		ag := agendaLoteBase(clinicaID, req.PacienteID, req.UsuarioID, principal, req.ConvenioID, req.Observacoes, req.StatusID, t)
		item := dto.PreviewAgendaLoteSessaoResponse{
			Indice:   i + 1,
			DataHora: t.In(loc).Format(time.RFC3339),
			Ok:       true,
		}
		if err := s.agendaRepository.VerificarSlotAgendamento(ag, extras); err != nil {
			item.Ok = false
			item.Erro = err.Error()
		}
		out = append(out, item)
	}
	return out, nil
}

func (s *agendaService) CriarAgendaLote(clinicaID uint, req dto.CriarAgendaLoteRequest) ([]models.Agenda, error) {
	ids, err := resolverProcedimentoIDsLote(req.ProcedimentoID, req.ProcedimentoIDs)
	if err != nil {
		return nil, err
	}
	principal := ids[0]
	extras := []uint{}
	if len(ids) > 1 {
		extras = append(extras, ids[1:]...)
	}

	_, err = s.pacienteRepo.BuscarPorIDClinica(req.PacienteID, clinicaID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("paciente não encontrado nesta clínica")
		}
		return nil, err
	}

	itens := make([]repositories.AgendaLoteItem, 0, len(req.Sessoes))
	for _, sess := range req.Sessoes {
		dataHora, err := utils.ParseAgendaDataHora(sess.DataHora)
		if err != nil {
			return nil, err
		}
		ag := agendaLoteBase(clinicaID, req.PacienteID, req.UsuarioID, principal, req.ConvenioID, req.Observacoes, req.StatusID, dataHora)
		itens = append(itens, repositories.AgendaLoteItem{Agenda: ag, ProcedimentosExtras: extras})
	}
	return s.agendaRepository.CriarLote(itens)
}
