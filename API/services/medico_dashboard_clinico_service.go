package services

import (
	"fmt"
	"regexp"
	"sort"
	"strings"
	"time"

	DTO "github.com/ferrariwill/Clinicas/API/models/DTO"
	"github.com/ferrariwill/Clinicas/API/repositories"
	"github.com/ferrariwill/Clinicas/API/utils"
)

var (
	cid10FormatoDashboard = regexp.MustCompile(`^[A-Z]\d{2}(\.\d{1,4})?$`)
	cid10ExtrairTexto     = regexp.MustCompile(`(?i)\b[A-Z]\d{2}(?:\.\d{1,4})?\b`)
)

type MedicoDashboardClinicoService interface {
	Resumo(clinicaID, profissionalID uint, semanas int) (*DTO.MedicoDashboardClinicoResponse, error)
}

type medicoDashboardClinicoService struct {
	prontRepo  repositories.ProntuarioRepository
	atestRepo  repositories.AtestadoRepository
}

func NovoMedicoDashboardClinicoService(
	prontRepo repositories.ProntuarioRepository,
	atestRepo repositories.AtestadoRepository,
) MedicoDashboardClinicoService {
	return &medicoDashboardClinicoService{prontRepo: prontRepo, atestRepo: atestRepo}
}

func normalizarCID10Dashboard(s string) string {
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

func (s *medicoDashboardClinicoService) Resumo(clinicaID, profissionalID uint, semanas int) (*DTO.MedicoDashboardClinicoResponse, error) {
	if semanas < 1 {
		semanas = 12
	}
	if semanas > 52 {
		semanas = 52
	}
	now := time.Now()
	desde := now.AddDate(0, 0, -7*semanas)

	prontos, err := s.prontRepo.ListarPorProfissionalDesde(clinicaID, profissionalID, desde)
	if err != nil {
		return nil, err
	}
	atestados, err := s.atestRepo.ListarPorProfissionalDesde(clinicaID, profissionalID, desde)
	if err != nil {
		return nil, err
	}

	cidCount := make(map[string]int)
	weekPront := make(map[string]int)
	weekAtest := make(map[string]int)

	weekKey := func(t time.Time) string {
		y, w := t.ISOWeek()
		return fmt.Sprintf("%04d-W%02d", y, w)
	}

	for _, p := range prontos {
		if !p.CreatedAt.IsZero() {
			weekPront[weekKey(p.CreatedAt)]++
		}
		titulo, errT := utils.DecryptSensitiveField(p.Titulo)
		conteudo, errC := utils.DecryptSensitiveField(p.Conteudo)
		if errT != nil || errC != nil {
			continue
		}
		text := titulo + "\n" + conteudo
		seen := make(map[string]struct{})
		for _, raw := range cid10ExtrairTexto.FindAllString(text, -1) {
			cid := normalizarCID10Dashboard(raw)
			if !cid10FormatoDashboard.MatchString(cid) {
				continue
			}
			if _, ok := seen[cid]; ok {
				continue
			}
			seen[cid] = struct{}{}
			cidCount[cid]++
		}
	}

	for _, a := range atestados {
		if !a.CreatedAt.IsZero() {
			weekAtest[weekKey(a.CreatedAt)]++
		}
		cipher := strings.TrimSpace(a.CID10)
		if cipher == "" || cipher == "••••" {
			continue
		}
		plain, err := utils.DecryptSensitiveField(cipher)
		if err != nil || plain == "" {
			continue
		}
		cid := normalizarCID10Dashboard(plain)
		if cid10FormatoDashboard.MatchString(cid) {
			cidCount[cid]++
		}
	}

	cidItems := make([]DTO.MedicoDashboardCIDItem, 0, len(cidCount))
	for k, v := range cidCount {
		if v > 0 {
			cidItems = append(cidItems, DTO.MedicoDashboardCIDItem{CID: k, Total: v})
		}
	}
	sort.Slice(cidItems, func(i, j int) bool {
		if cidItems[i].Total != cidItems[j].Total {
			return cidItems[i].Total > cidItems[j].Total
		}
		return cidItems[i].CID < cidItems[j].CID
	})
	if len(cidItems) > 15 {
		cidItems = cidItems[:15]
	}

	vol := make([]DTO.MedicoDashboardSemanaVol, 0, semanas)
	for i := semanas - 1; i >= 0; i-- {
		ref := now.AddDate(0, 0, -7*i)
		y, w := ref.ISOWeek()
		k := fmt.Sprintf("%04d-W%02d", y, w)
		pn := weekPront[k]
		at := weekAtest[k]
		rotulo := fmt.Sprintf("Sem. %d · %d", w, y)
		vol = append(vol, DTO.MedicoDashboardSemanaVol{
			Ano:         y,
			Semana:      w,
			Rotulo:      rotulo,
			Prontuarios: pn,
			Atestados:   at,
			Total:       pn + at,
		})
	}

	return &DTO.MedicoDashboardClinicoResponse{
		Semanas:         semanas,
		CidMaisComuns:   cidItems,
		VolumePorSemana: vol,
	}, nil
}
