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

type ProntuarioController struct {
	svc      services.ProntuarioService
	auditLog repositories.AuditLogRepository
}

func NovoProntuarioController(svc services.ProntuarioService, auditLog repositories.AuditLogRepository) *ProntuarioController {
	return &ProntuarioController{svc: svc, auditLog: auditLog}
}

func (pc *ProntuarioController) podeLer(c *gin.Context) bool {
	papel, err := middleware.ExtrairDoToken[string](c, "papel")
	return err == nil && rbac.PodeLerProntuario(papel)
}

func (pc *ProntuarioController) podeEscrever(c *gin.Context) bool {
	papel, err := middleware.ExtrairDoToken[string](c, "papel")
	return err == nil && rbac.PodeGerenciarProntuario(papel)
}

// @Summary Criar registro de prontuário
// @Description Registra evolução clínica (dados sensíveis — auditoria LGPD).
// @Tags Prontuário
// @Accept json
// @Produce json
// @Param body body CriarProntuarioRequest true "Dados"
// @Success 201 {object} ProntuarioRegistroSwagger
// @Router /clinicas/prontuarios [post]
// @Security BearerAuth
func (pc *ProntuarioController) Criar(c *gin.Context) {
	if !pc.podeEscrever(c) {
		c.JSON(http.StatusForbidden, gin.H{"erro": "Sem permissão para registrar prontuário"})
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
	var body dto.CriarProntuarioDTO
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "Dados inválidos"})
		return
	}
	reg := &models.ProntuarioRegistro{
		PacienteID: body.PacienteID,
		Titulo:     body.Titulo,
		Conteudo:   body.Conteudo,
	}
	if err := pc.svc.Criar(clinicaID, usuarioID, reg); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}
	audit.Log(c.Request.Context(), audit.AcaoProntuarioCriar, "prontuario_registro", reg.ID)
	_ = pc.auditLog.Registrar(&models.AuditLog{
		ClinicaID: clinicaID,
		UsuarioID: usuarioID,
		Acao:      audit.AcaoProntuarioCriar,
		Recurso:   "prontuario_registro",
		RecursoID: &reg.ID,
		IP:        c.ClientIP(),
	})
	c.JSON(http.StatusCreated, reg)
}

// @Summary Listar prontuário por paciente
// @Tags Prontuário
// @Param paciente_id query int true "ID do paciente"
// @Success 200 {array} ProntuarioRegistroSwagger
// @Router /clinicas/prontuarios [get]
// @Security BearerAuth
func (pc *ProntuarioController) Listar(c *gin.Context) {
	if !pc.podeLer(c) {
		c.JSON(http.StatusForbidden, gin.H{"erro": "Sem permissão para visualizar prontuário"})
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
	list, err := pc.svc.ListarPorPaciente(clinicaID, pid)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}
	usuarioID, _ := middleware.ExtrairDoToken[uint](c, "usuario_id")
	audit.Log(c.Request.Context(), audit.AcaoProntuarioLer, "prontuario_paciente", pid)
	_ = pc.auditLog.Registrar(&models.AuditLog{
		ClinicaID: clinicaID,
		UsuarioID: usuarioID,
		Acao:      audit.AcaoProntuarioLer,
		Recurso:   "prontuario_paciente",
		IP:        c.ClientIP(),
	})
	c.JSON(http.StatusOK, list)
}

// @Summary Atualizar registro de prontuário
// @Description Permitido apenas até 24h após a criação.
// @Tags Prontuário
// @Param id path int true "ID"
// @Param body body AtualizarProntuarioRequest true "Dados"
// @Router /clinicas/prontuarios/{id} [put]
// @Security BearerAuth
func (pc *ProntuarioController) Atualizar(c *gin.Context) {
	if !pc.podeEscrever(c) {
		c.JSON(http.StatusForbidden, gin.H{"erro": "Sem permissão para editar prontuário"})
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
	id, err := utils.StringParaUint(c.Param("id"))
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "ID inválido"})
		return
	}
	var body dto.AtualizarProntuarioDTO
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "Dados inválidos"})
		return
	}
	svcErr := pc.svc.Atualizar(clinicaID, id, body.Titulo, body.Conteudo)
	if svcErr != nil {
		if errors.Is(svcErr, services.ErrProntuarioImutavel) {
			c.JSON(http.StatusConflict, gin.H{"erro": svcErr.Error()})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"erro": svcErr.Error()})
		return
	}
	audit.Log(c.Request.Context(), audit.AcaoProntuarioAtualizar, "prontuario_registro", id)
	_ = pc.auditLog.Registrar(&models.AuditLog{
		ClinicaID: clinicaID,
		UsuarioID: usuarioID,
		Acao:      audit.AcaoProntuarioAtualizar,
		Recurso:   "prontuario_registro",
		RecursoID: &id,
		IP:        c.ClientIP(),
	})
	c.JSON(http.StatusOK, gin.H{"mensagem": "Registro atualizado"})
}
