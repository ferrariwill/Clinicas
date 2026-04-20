package controllers

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/ferrariwill/Clinicas/API/internal/rbac"
	"github.com/ferrariwill/Clinicas/API/middleware"
	"github.com/ferrariwill/Clinicas/API/models"
	dto "github.com/ferrariwill/Clinicas/API/models/DTO"
	"github.com/ferrariwill/Clinicas/API/services"
	"github.com/ferrariwill/Clinicas/API/utils"
	"github.com/gin-gonic/gin"
)

type atualizarUsuarioBody struct {
	Nome              *string `json:"nome"`
	Email             *string `json:"email"`
	Senha             *string `json:"senha"`
	TipoUsuarioID     *uint   `json:"tipo_usuario_id"`
	MaxPacientes      *int    `json:"max_pacientes"`
	PermiteSimultaneo *bool   `json:"permite_simultaneo"`
}

func podeGerenciarEquipeUsuario(papel string) bool {
	return papel == rbac.PapelDono || papel == rbac.PapelADMGeral
}

type UsuarioController struct {
	usuarioService     services.UsuarioService
	horarioService     services.UsuarioHorarioService
	assinaturaService  services.AssinaturaService
	planoService       services.PlanoService
}

func NovoUsuarioController(
	usuarioService services.UsuarioService,
	horarioService services.UsuarioHorarioService,
	assinaturaService services.AssinaturaService,
	planoService services.PlanoService,
) *UsuarioController {
	return &UsuarioController{
		usuarioService:    usuarioService,
		horarioService:    horarioService,
		assinaturaService: assinaturaService,
		planoService:      planoService,
	}
}

func (uc *UsuarioController) verificarLimiteUsuariosClinica(clinicaID uint) error {
	if uc.assinaturaService == nil || uc.planoService == nil {
		return nil
	}
	ptr, err := uc.assinaturaService.Consultar(&clinicaID, nil)
	if err != nil || ptr == nil || len(*ptr) == 0 {
		return nil
	}
	var ativa *models.Assinatura
	for i := range *ptr {
		a := &(*ptr)[i]
		if a.Ativa {
			ativa = a
			break
		}
	}
	if ativa == nil {
		return nil
	}
	plano, err := uc.planoService.BuscarPorId(int(ativa.PlanoID))
	if err != nil || plano == nil || plano.LimiteUsuarios <= 0 {
		return nil
	}
	soAtivos := true
	lista, err := uc.usuarioService.ListarPorClinica(clinicaID, &soAtivos)
	if err != nil {
		return err
	}
	n := 0
	for _, u := range lista {
		if u.TipoUsuario.Papel == rbac.PapelDono {
			continue
		}
		n++
	}
	if n >= plano.LimiteUsuarios {
		return fmt.Errorf("limite de usuários do plano atingido (%d). Atualize o plano ou desative um usuário", plano.LimiteUsuarios)
	}
	return nil
}

func (uc *UsuarioController) contextoClinica(c *gin.Context) (clinicaID uint, actorID uint, papel string, ok bool) {
	var err error
	clinicaID, err = middleware.ExtrairDoToken[uint](c, "clinica_id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "clinica_id inválido no token"})
		return 0, 0, "", false
	}
	actorID, err = middleware.ExtrairDoToken[uint](c, "usuario_id")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Token inválido"})
		return 0, 0, "", false
	}
	papel, _ = middleware.ExtrairDoToken[string](c, "papel")
	return clinicaID, actorID, papel, true
}

func (uc *UsuarioController) podeAcessarAlvo(c *gin.Context, alvo *models.Usuario, clinicaID, actorID uint, papel string) bool {
	ok, err := uc.usuarioService.PertenceAClinica(alvo.ID, clinicaID)
	if err != nil || !ok {
		c.JSON(http.StatusForbidden, gin.H{"error": "Usuário não pertence à sua clínica"})
		return false
	}
	if alvo.ID == actorID {
		return true
	}
	if !podeGerenciarEquipeUsuario(papel) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Sem permissão para gerenciar este usuário"})
		return false
	}
	return true
}

// @Summary Criar usuário
// @Description Cria um novo usuário na clínica
// @Tags Usuários
// @Accept json
// @Produce json
// @Param usuario body UsuarioRequest true "Dados do usuário"
// @Success 201 {object} UsuarioResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /usuarios [post]
func (uc *UsuarioController) Criar(c *gin.Context) {
	var u models.Usuario

	if err := c.ShouldBindJSON(&u); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	clinicaId, err := middleware.ExtrairDoToken[uint](c, "clinica_id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := uc.verificarLimiteUsuariosClinica(clinicaId); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	if err := uc.usuarioService.CriarUsuario(&u, clinicaId); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"usuario": u})
}

// @Summary Listar usuários
// @Description Lista todos os usuários da clínica
// @Tags Usuários
// @Accept json
// @Produce json
// @Param ativos query boolean false "Filtrar apenas usuários ativos"
// @Success 200 {array} UsuarioResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /usuarios [get]
func (uc *UsuarioController) Listar(c *gin.Context) {
	clinicaId, err := middleware.ExtrairDoToken[uint](c, "clinica_id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var filtro *bool
	if param := c.Query("ativos"); param != "" {
		ativo := param == "true"
		filtro = &ativo
	}

	usuarios, err := uc.usuarioService.ListarPorClinica(clinicaId, filtro)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"usuarios": usuarios})
}

// @Summary Buscar usuário por ID
// @Description Busca um usuário específico pelo ID
// @Tags Usuários
// @Accept json
// @Produce json
// @Param id path int true "ID do usuário"
// @Success 200 {object} UsuarioResponse
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Security BearerAuth
// @Router /usuarios/{id} [get]
func (uc *UsuarioController) Buscar(c *gin.Context) {
	id := c.Param("id")
	usuarioId, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID inválido"})
		return
	}

	clinicaID, actorID, papel, ok := uc.contextoClinica(c)
	if !ok {
		return
	}

	usuario, err := uc.usuarioService.BuscarPorID(uint(usuarioId))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	if !uc.podeAcessarAlvo(c, usuario, clinicaID, actorID, papel) {
		return
	}

	c.JSON(http.StatusOK, gin.H{"usuario": usuario})
}

// @Summary Atualizar usuário
// @Description Atualiza os dados de um usuário
// @Tags Usuários
// @Accept json
// @Produce json
// @Param id path int true "ID do usuário"
// @Param usuario body UsuarioRequest true "Dados do usuário"
// @Success 200 {object} UsuarioResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /usuarios/{id} [put]
func (uc *UsuarioController) Atualizar(c *gin.Context) {
	id := c.Param("id")
	usuarioId, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID inválido"})
		return
	}

	clinicaID, actorID, papel, ok := uc.contextoClinica(c)
	if !ok {
		return
	}

	existente, err := uc.usuarioService.BuscarPorID(uint(usuarioId))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	if !uc.podeAcessarAlvo(c, existente, clinicaID, actorID, papel) {
		return
	}

	var body atualizarUsuarioBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if body.Nome != nil {
		existente.Nome = *body.Nome
	}
	if body.Email != nil {
		existente.Email = *body.Email
	}
	if body.Senha != nil && *body.Senha != "" {
		hash, err := utils.HashSenha(*body.Senha)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao processar senha"})
			return
		}
		existente.Senha = hash
	}
	var novoTipo *uint
	if body.TipoUsuarioID != nil {
		tipoNaClinica, err := uc.usuarioService.BuscarTipoNaClinica(uint(usuarioId), clinicaID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Usuário sem vínculo com esta clínica"})
			return
		}
		if *body.TipoUsuarioID != tipoNaClinica && !podeGerenciarEquipeUsuario(papel) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Sem permissão para alterar o tipo de usuário"})
			return
		}
		novoTipo = body.TipoUsuarioID
	}
	if body.MaxPacientes != nil && (podeGerenciarEquipeUsuario(papel) || existente.ID == actorID) {
		existente.MaxPacientes = *body.MaxPacientes
	}
	if body.PermiteSimultaneo != nil && (podeGerenciarEquipeUsuario(papel) || existente.ID == actorID) {
		existente.PermiteSimultaneo = *body.PermiteSimultaneo
	}

	if err := uc.usuarioService.AtualizarUsuario(existente); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if novoTipo != nil {
		if err := uc.usuarioService.AtualizarTipoUsuarioNaClinica(uint(usuarioId), clinicaID, *novoTipo); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	atualizado, err := uc.usuarioService.BuscarPorID(uint(usuarioId))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	atualizado.Senha = ""
	c.JSON(http.StatusOK, gin.H{"usuario": atualizado})
}

// @Summary Desativar usuário
// @Description Desativa um usuário
// @Tags Usuários
// @Accept json
// @Produce json
// @Param id path int true "ID do usuário"
// @Success 200 {object} MessageResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /usuarios/{id} [delete]
func (uc *UsuarioController) Deletar(c *gin.Context) {
	id := c.Param("id")
	usuarioId, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID inválido"})
		return
	}

	clinicaID, actorID, papel, ok := uc.contextoClinica(c)
	if !ok {
		return
	}

	alvo, err := uc.usuarioService.BuscarPorID(uint(usuarioId))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	if !uc.podeAcessarAlvo(c, alvo, clinicaID, actorID, papel) {
		return
	}
	if alvo.ID == actorID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Não é possível desativar o próprio usuário"})
		return
	}

	if err := uc.usuarioService.DesativarUsuario(uint(usuarioId)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Usuário desativado com sucesso"})
}

func (uc *UsuarioController) Ativar(c *gin.Context) {
	id := c.Param("id")
	usuarioId, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID inválido"})
		return
	}

	clinicaID, actorID, papel, ok := uc.contextoClinica(c)
	if !ok {
		return
	}

	alvo, err := uc.usuarioService.BuscarPorID(uint(usuarioId))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	if !uc.podeAcessarAlvo(c, alvo, clinicaID, actorID, papel) {
		return
	}

	if err := uc.usuarioService.ReativarUsuario(uint(usuarioId)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Usuário ativado com sucesso"})
}

func (uc *UsuarioController) ListarTodos(c *gin.Context) {
	var filtro *bool
	if param := c.Query("ativos"); param != "" {
		ativo := param == "true"
		filtro = &ativo
	}
	usuarios, err := uc.usuarioService.Listar(filtro)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao consultar usuarios"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"usuarios": usuarios})
}

func (uc *UsuarioController) CriarUsuarioClinica(c *gin.Context) {
	var dto dto.CriarUsuarioClinicaDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}

	usuarioClinicaID, err := middleware.ExtrairDoToken[uint](c, "clinica_id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Erro ao extrair clinica_id do token"})
		return
	}

	if err := uc.verificarLimiteUsuariosClinica(usuarioClinicaID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	usuario, emailEnviado, err := uc.usuarioService.CriarUsuarioClinica(dto, usuarioClinicaID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	usuario.Senha = ""
	c.JSON(http.StatusCreated, gin.H{
		"usuario":        usuario,
		"email_enviado":  emailEnviado,
		"obrigar_troca": usuario.ObrigarTrocaSenha,
	})
}

// @Summary Buscar horários do usuário
// @Description Retorna os horários de trabalho do usuário
// @Tags Usuários
// @Accept json
// @Produce json
// @Param id path int true "ID do usuário"
// @Success 200 {array} UsuarioHorarioResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /usuarios/{id}/horarios [get]
func (uc *UsuarioController) BuscarHorarios(c *gin.Context) {
	id := c.Param("id")
	usuarioId, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID inválido"})
		return
	}

	clinicaID, actorID, papel, ok := uc.contextoClinica(c)
	if !ok {
		return
	}
	alvo, err := uc.usuarioService.BuscarPorID(uint(usuarioId))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	if !uc.podeAcessarAlvo(c, alvo, clinicaID, actorID, papel) {
		return
	}

	horarios, err := uc.horarioService.BuscarHorarios(uint(usuarioId))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, horarios)
}

// @Summary Definir horários do usuário
// @Description Define os horários de trabalho do usuário
// @Tags Usuários
// @Accept json
// @Produce json
// @Param id path int true "ID do usuário"
// @Param horarios body DefinirHorariosRequest true "Horários do usuário"
// @Success 200 {object} MessageResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /usuarios/{id}/horarios [put]
func (uc *UsuarioController) DefinirHorarios(c *gin.Context) {
	id := c.Param("id")
	usuarioId, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID inválido"})
		return
	}

	clinicaID, actorID, papel, ok := uc.contextoClinica(c)
	if !ok {
		return
	}
	alvo, err := uc.usuarioService.BuscarPorID(uint(usuarioId))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	if !uc.podeAcessarAlvo(c, alvo, clinicaID, actorID, papel) {
		return
	}

	var req dto.DefinirHorariosRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}

	if err := uc.horarioService.DefinirHorarios(uint(usuarioId), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Horários definidos com sucesso"})
}
