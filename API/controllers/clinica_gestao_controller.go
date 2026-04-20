package controllers

import (
	"net/http"
	"strconv"

	"github.com/ferrariwill/Clinicas/API/internal/rbac"
	"github.com/ferrariwill/Clinicas/API/middleware"
	"github.com/ferrariwill/Clinicas/API/models/DTO"
	servicedto "github.com/ferrariwill/Clinicas/API/models/DTO/ServiceDTO"
	"github.com/ferrariwill/Clinicas/API/services"
	"github.com/gin-gonic/gin"
)

// ClinicaGestaoController expõe CRUD de tipos de usuário e permissões de tela
// para o dono da clínica (e ADM_GERAL), sempre escopado ao clinica_id do JWT.
type ClinicaGestaoController struct {
	tipoUsuarioService   services.TipoUsuarioService
	telaService          services.TelaService
	permissaoTelaService services.PermissaoTelaService
}

func NovoClinicaGestaoController(
	tipoUsuarioService services.TipoUsuarioService,
	telaService services.TelaService,
	permissaoTelaService services.PermissaoTelaService,
) *ClinicaGestaoController {
	return &ClinicaGestaoController{
		tipoUsuarioService:   tipoUsuarioService,
		telaService:          telaService,
		permissaoTelaService: permissaoTelaService,
	}
}

func clinicaIDGestao(c *gin.Context) (uint, bool) {
	id, err := middleware.ExtrairDoToken[uint](c, "clinica_id")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"erro": err.Error()})
		return 0, false
	}
	return id, true
}

func papelPermitidoClinica(p string) bool {
	switch p {
	case rbac.PapelDono, rbac.PapelMedico, rbac.PapelSecretaria:
		return true
	default:
		return false
	}
}

// ListarTelas catálogo global de telas (somente leitura para montar permissões).
func (gc *ClinicaGestaoController) ListarTelas(c *gin.Context) {
	telas, err := gc.telaService.ListarTelas()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erro": "Erro ao listar telas"})
		return
	}
	c.JSON(http.StatusOK, telas)
}

func (gc *ClinicaGestaoController) ListarTipos(c *gin.Context) {
	clinicaID, ok := clinicaIDGestao(c)
	if !ok {
		return
	}
	tipos, err := gc.tipoUsuarioService.ListarPorClinica(clinicaID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erro": err.Error()})
		return
	}
	c.JSON(http.StatusOK, tipos)
}

func (gc *ClinicaGestaoController) CriarTipo(c *gin.Context) {
	clinicaID, ok := clinicaIDGestao(c)
	if !ok {
		return
	}
	var dto DTO.CriarTipoUsuarioDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "Dados inválidos"})
		return
	}
	if dto.Papel == rbac.PapelADMGeral {
		c.JSON(http.StatusForbidden, gin.H{"erro": "Não é permitido criar perfil com papel de administrador global"})
		return
	}
	if !papelPermitidoClinica(dto.Papel) {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "Papel deve ser DONO, MEDICO ou SECRETARIA"})
		return
	}
	tu := servicedto.CriarTipoUsuarioDTO_CriarTipoUsuario(dto)
	tu.ClinicaID = clinicaID
	if err := gc.tipoUsuarioService.Criar(&tu); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erro": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, tu)
}

func (gc *ClinicaGestaoController) BuscarTipo(c *gin.Context) {
	clinicaID, ok := clinicaIDGestao(c)
	if !ok {
		return
	}
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "ID inválido"})
		return
	}
	tu, err := gc.tipoUsuarioService.BuscarPorIDEClinica(uint(id), clinicaID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"erro": "Tipo não encontrado nesta clínica"})
		return
	}
	c.JSON(http.StatusOK, tu)
}

type atualizarTipoGestaoBody struct {
	Nome      string `json:"nome"`
	Descricao string `json:"descricao"`
	Papel     string `json:"papel"`
}

func (gc *ClinicaGestaoController) AtualizarTipo(c *gin.Context) {
	clinicaID, ok := clinicaIDGestao(c)
	if !ok {
		return
	}
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "ID inválido"})
		return
	}
	tu, err := gc.tipoUsuarioService.BuscarPorIDEClinica(uint(id), clinicaID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"erro": "Tipo não encontrado nesta clínica"})
		return
	}
	var body atualizarTipoGestaoBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "Dados inválidos"})
		return
	}
	if body.Papel != "" {
		if body.Papel == rbac.PapelADMGeral {
			c.JSON(http.StatusForbidden, gin.H{"erro": "Papel ADM_GERAL não permitido"})
			return
		}
		if !papelPermitidoClinica(body.Papel) {
			c.JSON(http.StatusBadRequest, gin.H{"erro": "Papel inválido"})
			return
		}
		tu.Papel = body.Papel
	}
	if body.Nome != "" {
		tu.Nome = body.Nome
	}
	if body.Descricao != "" {
		tu.Descricao = body.Descricao
	}
	tu.ClinicaID = clinicaID
	if err := gc.tipoUsuarioService.Atualizar(tu); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erro": err.Error()})
		return
	}
	c.JSON(http.StatusOK, tu)
}

func (gc *ClinicaGestaoController) DesativarTipo(c *gin.Context) {
	clinicaID, ok := clinicaIDGestao(c)
	if !ok {
		return
	}
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "ID inválido"})
		return
	}
	if _, err := gc.tipoUsuarioService.BuscarPorIDEClinica(uint(id), clinicaID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"erro": "Tipo não encontrado nesta clínica"})
		return
	}
	if err := gc.tipoUsuarioService.Desativar(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erro": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"mensagem": "Tipo desativado"})
}

func (gc *ClinicaGestaoController) ReativarTipo(c *gin.Context) {
	clinicaID, ok := clinicaIDGestao(c)
	if !ok {
		return
	}
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "ID inválido"})
		return
	}
	if _, err := gc.tipoUsuarioService.BuscarPorIDEClinica(uint(id), clinicaID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"erro": "Tipo não encontrado nesta clínica"})
		return
	}
	if err := gc.tipoUsuarioService.Reativar(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erro": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"mensagem": "Tipo reativado"})
}

func (gc *ClinicaGestaoController) AssociarPermissao(c *gin.Context) {
	clinicaID, ok := clinicaIDGestao(c)
	if !ok {
		return
	}
	var req struct {
		TipoUsuarioID uint `json:"tipo_usuario_id" binding:"required"`
		TelaID        uint `json:"tela_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}
	if _, err := gc.tipoUsuarioService.BuscarPorIDEClinica(req.TipoUsuarioID, clinicaID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"erro": "Tipo de usuário não pertence a esta clínica"})
		return
	}
	if err := gc.permissaoTelaService.AssociarTela(req.TipoUsuarioID, req.TelaID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erro": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"mensagem": "Permissão concedida"})
}

func (gc *ClinicaGestaoController) DesassociarPermissao(c *gin.Context) {
	clinicaID, ok := clinicaIDGestao(c)
	if !ok {
		return
	}
	tipoUsuarioID, err := strconv.ParseUint(c.Param("tipo_usuario_id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "tipo_usuario_id inválido"})
		return
	}
	telaID, err := strconv.ParseUint(c.Param("tela_id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "tela_id inválido"})
		return
	}
	if _, err := gc.tipoUsuarioService.BuscarPorIDEClinica(uint(tipoUsuarioID), clinicaID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"erro": "Tipo de usuário não pertence a esta clínica"})
		return
	}
	if err := gc.permissaoTelaService.DesassociarTela(uint(tipoUsuarioID), uint(telaID)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erro": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"mensagem": "Permissão removida"})
}

func (gc *ClinicaGestaoController) ListarPermissoesPorTipo(c *gin.Context) {
	clinicaID, ok := clinicaIDGestao(c)
	if !ok {
		return
	}
	tipoUsuarioID, err := strconv.ParseUint(c.Param("tipo_usuario_id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "tipo_usuario_id inválido"})
		return
	}
	if _, err := gc.tipoUsuarioService.BuscarPorIDEClinica(uint(tipoUsuarioID), clinicaID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"erro": "Tipo de usuário não pertence a esta clínica"})
		return
	}
	permissoes, err := gc.permissaoTelaService.ListarTelasPorTipoUsuario(uint(tipoUsuarioID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erro": err.Error()})
		return
	}
	c.JSON(http.StatusOK, permissoes)
}
