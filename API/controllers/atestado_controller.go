package controllers

import (
	"errors"
	"net/http"

	"github.com/ferrariwill/Clinicas/API/internal/audit"
	"github.com/ferrariwill/Clinicas/API/internal/rbac"
	"github.com/ferrariwill/Clinicas/API/middleware"
	"github.com/ferrariwill/Clinicas/API/models"
	dto "github.com/ferrariwill/Clinicas/API/models/DTO"
	"github.com/ferrariwill/Clinicas/API/repositories"
	"github.com/ferrariwill/Clinicas/API/services"
	"github.com/ferrariwill/Clinicas/API/utils"
	"github.com/gin-gonic/gin"
)

type AtestadoController struct {
	svc          services.AtestadoService
	usuarioRepo  repositories.UsuarioRepository
	pacienteRepo repositories.PacienteRepository
	auditLog     repositories.AuditLogRepository
}

func NovoAtestadoController(
	svc services.AtestadoService,
	usuarioRepo repositories.UsuarioRepository,
	pacienteRepo repositories.PacienteRepository,
	auditLog repositories.AuditLogRepository,
) *AtestadoController {
	return &AtestadoController{svc: svc, usuarioRepo: usuarioRepo, pacienteRepo: pacienteRepo, auditLog: auditLog}
}

func (ac *AtestadoController) podeEscrever(c *gin.Context) bool {
	papel, err := middleware.ExtrairDoToken[string](c, "papel")
	return err == nil && rbac.PodeGerenciarProntuario(papel)
}

func (ac *AtestadoController) podeLer(c *gin.Context) bool {
	papel, err := middleware.ExtrairDoToken[string](c, "papel")
	return err == nil && rbac.PodeLerProntuario(papel)
}

// @Summary Emitir atestado médico
// @Tags Atestados
// @Accept json
// @Param body body dto.CriarAtestadoDTO true "Dados"
// @Success 201 {object} models.AtestadoMedico
// @Router /clinicas/atestados [post]
// @Security BearerAuth
func (ac *AtestadoController) Criar(c *gin.Context) {
	if !ac.podeEscrever(c) {
		c.JSON(http.StatusForbidden, gin.H{"erro": "Sem permissão para emitir atestado"})
		return
	}
	clinicaID, err := middleware.ExtrairDoToken[uint](c, "clinica_id")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"erro": err.Error()})
		return
	}
	usuarioID, err := middleware.ExtrairDoToken[uint](c, "usuario_id")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"erro": err.Error()})
		return
	}
	espToken, _ := middleware.ExtrairDoToken[string](c, "especialidade")

	var body dto.CriarAtestadoDTO
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "Dados inválidos"})
		return
	}

	pac, err := ac.pacienteRepo.BuscarPorIDClinica(body.PacienteID, clinicaID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "Paciente não encontrado"})
		return
	}
	prof, err := ac.usuarioRepo.BuscarPorID(usuarioID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "Profissional não encontrado"})
		return
	}

	reg := &models.AtestadoMedico{
		PacienteID: body.PacienteID,
		Tipo:       body.Tipo,
		Quantidade: body.Quantidade,
		CID10:      body.CID10,
	}
	err = ac.svc.Criar(clinicaID, usuarioID, espToken, reg, pac.Nome, pac.CPF, prof.Nome, prof.Especialidade, body.ConsultaHoraInicio, body.ConsultaHoraFim)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrAtestadoCID10Obrigatorio):
			c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
			return
		case errors.Is(err, services.ErrAtestadoCID10Formato):
			c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
			return
		case errors.Is(err, services.ErrAtestadoTipoInvalido), errors.Is(err, services.ErrAtestadoQuantidade):
			c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
			return
		case errors.Is(err, services.ErrAtestadoEspecialidade):
			c.JSON(http.StatusForbidden, gin.H{"erro": err.Error()})
			return
		case errors.Is(err, services.ErrAtestadoHorasConsultaPar), errors.Is(err, services.ErrAtestadoHorasConsultaFmt):
			c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"erro": utils.SafeErrorMessage(err, "Não foi possível salvar o atestado")})
		return
	}

	audit.Log(c.Request.Context(), audit.AcaoAtestadoCriar, "atestado_medico", reg.ID)
	_ = ac.auditLog.Registrar(&models.AuditLog{
		ClinicaID:  clinicaID,
		UsuarioID:  usuarioID,
		PacienteID: &body.PacienteID,
		Acao:       audit.AcaoAtestadoCriar,
		Recurso:    "atestado_medico",
		RecursoID:  &reg.ID,
		IP:         c.ClientIP(),
	})

	papelResp, _ := middleware.ExtrairDoToken[string](c, "papel")
	list, errList := ac.svc.ListarPorPaciente(clinicaID, body.PacienteID, papelResp)
	if errList != nil {
		c.JSON(http.StatusCreated, gin.H{"id": reg.ID, "mensagem": "Atestado salvo; recarregue a lista para ver o texto."})
		return
	}
	for i := range list {
		if list[i].ID == reg.ID {
			c.JSON(http.StatusCreated, list[i])
			return
		}
	}
	c.JSON(http.StatusCreated, gin.H{"id": reg.ID})
}

// @Summary Listar atestados do paciente
// @Tags Atestados
// @Param paciente_id query int true "Paciente"
// @Success 200 {array} models.AtestadoMedico
// @Router /clinicas/atestados [get]
// @Security BearerAuth
func (ac *AtestadoController) Listar(c *gin.Context) {
	if !ac.podeLer(c) {
		c.JSON(http.StatusForbidden, gin.H{"erro": "Sem permissão"})
		return
	}
	clinicaID, err := middleware.ExtrairDoToken[uint](c, "clinica_id")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"erro": err.Error()})
		return
	}
	pid, err := utils.StringParaUint(c.Query("paciente_id"))
	if err != nil || pid == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "Informe paciente_id"})
		return
	}
	papel, _ := middleware.ExtrairDoToken[string](c, "papel")
	list, err := ac.svc.ListarPorPaciente(clinicaID, pid, papel)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": utils.SafeErrorMessage(err, "Não foi possível listar atestados")})
		return
	}
	usuarioID, _ := middleware.ExtrairDoToken[uint](c, "usuario_id")
	audit.Log(c.Request.Context(), audit.AcaoAtestadoLer, "atestado_paciente", pid)
	_ = ac.auditLog.Registrar(&models.AuditLog{
		ClinicaID:  clinicaID,
		UsuarioID:  usuarioID,
		PacienteID: &pid,
		Acao:       audit.AcaoAtestadoLer,
		Recurso:    "atestado_paciente",
		IP:         c.ClientIP(),
	})

	c.JSON(http.StatusOK, list)
}
